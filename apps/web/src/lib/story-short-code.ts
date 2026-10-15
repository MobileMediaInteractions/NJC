// A lossless base-62 encoding of the existing UUID: no truncated hashes,
// collision handling, write-on-read, or migration required for older articles.
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const zero = BigInt(0);
const radix = BigInt(62);
const maxUuid = BigInt("0xffffffffffffffffffffffffffffffff");

export function storyShortCode(id: string): string | null {
  if (!uuidPattern.test(id)) return null;
  let value = BigInt(`0x${id.replaceAll("-", "")}`);
  let code = "";
  do {
    code = alphabet[Number(value % radix)] + code;
    value /= radix;
  } while (value > zero);
  return code.padStart(22, "0");
}

export function storyIdFromShortCode(code: string): string | null {
  if (!/^[0-9a-zA-Z]{22}$/.test(code)) return null;
  let value = zero;
  for (const character of code) value = value * radix + BigInt(alphabet.indexOf(character));
  if (value > maxUuid) return null;
  const hex = value.toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getStoryShortUrl(id: string | undefined, siteOrigin: string): string | null {
  const code = id ? storyShortCode(id) : null;
  return code ? new URL(`/s/${code}`, siteOrigin).toString() : null;
}
