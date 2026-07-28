import { NextResponse } from "next/server";
import { getDistributionManager } from "@/lib/distribution";
import { searchStudioAccounts } from "@/lib/studio-accounts";

export async function GET(request: Request) {
  const manager = await getDistributionManager();
  if (!manager) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Distribution manager access required" } },
      { status: 403 },
    );
  }
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ data: [], meta: { apiVersion: "1" } });
  }
  const accounts = await searchStudioAccounts(query.slice(0, 120), 10);
  return NextResponse.json(
    { data: accounts, meta: { apiVersion: "1" } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
