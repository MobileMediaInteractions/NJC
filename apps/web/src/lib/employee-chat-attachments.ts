export const EMPLOYEE_CHAT_ATTACHMENT_MAX_BYTES = 4_000_000;
export const EMPLOYEE_CHAT_ATTACHMENT_MAX_COUNT = 10;

export const employeeChatAttachmentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const allowedTypes = new Set<string>(employeeChatAttachmentTypes);

export function validateEmployeeChatAttachment(file: Pick<File, "size" | "type">) {
  if (file.size < 1 || file.size > EMPLOYEE_CHAT_ATTACHMENT_MAX_BYTES || !allowedTypes.has(file.type)) {
    return "Use a JPEG, PNG, WebP, or PDF file up to 4 MB";
  }
  return null;
}

export function formatEmployeeChatAttachmentSize(size: number) {
  if (size < 1_000_000) return `${Math.max(1, Math.round(size / 1_000))} KB`;
  return `${(size / 1_000_000).toFixed(1)} MB`;
}

export function canArchiveEmployeeChatChannel(kind: string) {
  return kind === "public" || kind === "private";
}

const deletionCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createEmployeeChatDeletionCode(randomBytes: Uint8Array) {
  const characters = Array.from(randomBytes.slice(0, 6), (value) => deletionCodeAlphabet[value % deletionCodeAlphabet.length]).join("");
  if (characters.length !== 6) throw new Error("Six random bytes are required for a channel deletion code");
  return `DELETE-${characters}`;
}
