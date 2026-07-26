import { asc, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { accessCreditLedger } from "@harborline/backend/schema";

export type CreditLedgerRow = {
  id: string;
  userClerkId: string;
  amount: number;
  expiresAt: Date | null;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: Date;
};

export function remainingCreditLots(rows: CreditLedgerRow[]) {
  const remaining = new Map<string, number>();
  const positiveRows: CreditLedgerRow[] = [];
  for (const row of [...rows].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())) {
    if (row.amount > 0) {
      positiveRows.push(row);
      remaining.set(row.id, row.amount);
      continue;
    }
    let debit = Math.abs(row.amount);
    if (row.sourceType === "access_credit_expiration" && row.sourceId) {
      const available = remaining.get(row.sourceId) ?? 0;
      remaining.set(row.sourceId, Math.max(0, available - debit));
      continue;
    }
    const eligible = positiveRows
      .filter((lot) => lot.createdAt <= row.createdAt && (remaining.get(lot.id) ?? 0) > 0)
      .sort((left, right) => {
        const leftExpiry = left.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
        const rightExpiry = right.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
        return leftExpiry - rightExpiry || left.createdAt.getTime() - right.createdAt.getTime();
      });
    for (const lot of eligible) {
      if (debit <= 0) break;
      const available = remaining.get(lot.id) ?? 0;
      const consumed = Math.min(available, debit);
      remaining.set(lot.id, available - consumed);
      debit -= consumed;
    }
  }
  return remaining;
}

export async function expireAccessCredits(now = new Date(), userClerkId?: string) {
  if (!hasDatabase()) return { created: 0 };
  const rows = await getDb().select({
    id: accessCreditLedger.id,
    userClerkId: accessCreditLedger.userClerkId,
    amount: accessCreditLedger.amount,
    expiresAt: accessCreditLedger.expiresAt,
    sourceType: accessCreditLedger.sourceType,
    sourceId: accessCreditLedger.sourceId,
    createdAt: accessCreditLedger.createdAt,
  }).from(accessCreditLedger)
    .where(userClerkId ? eq(accessCreditLedger.userClerkId, userClerkId) : undefined)
    .orderBy(asc(accessCreditLedger.createdAt));
  const groups = new Map<string, CreditLedgerRow[]>();
  for (const row of rows) groups.set(row.userClerkId, [...(groups.get(row.userClerkId) ?? []), row]);
  let created = 0;
  for (const [accountId, accountRows] of groups) {
    const remaining = remainingCreditLots(accountRows);
    const due = accountRows.filter((row) => row.amount > 0 && row.expiresAt && row.expiresAt <= now);
    for (const row of due) {
      const [record] = await getDb().insert(accessCreditLedger).values({
        userClerkId: accountId,
        amount: -(remaining.get(row.id) ?? 0),
        transactionType: "expiration",
        reason: `Expired Access Credits from transaction ${row.id}`,
        sourceType: "access_credit_expiration",
        sourceId: row.id,
        idempotencyKey: `expire:${row.id}`,
        createdByClerkId: "system:daily-maintenance",
      }).onConflictDoNothing().returning({ id: accessCreditLedger.id });
      if (record) created += 1;
    }
  }
  return { created };
}
