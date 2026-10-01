import { z } from "zod";

export const MAX_BOOKWRIGHT_PDF_BYTES = 2_000_000_000;

export const magazinePageInput = z.object({
  id: z.uuid(),
  kicker: z.string().trim().max(80).default(""),
  title: z.string().trim().max(180).default(""),
  body: z.string().trim().max(8_000).default(""),
  imageAssetId: z.uuid().optional(),
});

export const magazinePagesInput = z.array(magazinePageInput).max(200);

export const magazineCreateInput = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(1_000).default(""),
  sourcePathname: z.string().trim().min(8).max(1_000).optional(),
  pages: magazinePagesInput.optional(),
});

export const magazineUpdateInput = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(1_000),
  pages: magazinePagesInput,
  status: z.enum(["draft", "review", "approved", "archived"]),
});

export function canUseMagEngine(role: string) {
  return role === "admin" || role === "editor" || role === "producer";
}

export function magazineSlug(title: string, id: string) {
  const base = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "magazine";
  return `${base}-${id.slice(0, 8)}`;
}
