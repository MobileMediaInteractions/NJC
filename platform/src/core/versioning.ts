export type Version = readonly [number, number, number];
export function parseVersion(value: string): Version {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value);
  if (!match) throw new Error(`Invalid semantic version: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
export function compareVersions(a: string, b: string) {
  const left = parseVersion(a); const right = parseVersion(b);
  for (let index = 0; index < 3; index += 1) { const difference = (left[index] ?? 0) - (right[index] ?? 0); if (difference) return Math.sign(difference); }
  return 0;
}
export function versionInRange(value: string, minimum: string, maximum: string) { return compareVersions(value, minimum) >= 0 && compareVersions(value, maximum) <= 0; }
export function satisfiesRange(value: string, range: string) {
  if (range.startsWith("^")) { const base = parseVersion(range.slice(1)); const current = parseVersion(value); return current[0] === base[0] && compareVersions(value, range.slice(1)) >= 0; }
  if (range.startsWith(">=")) return compareVersions(value, range.slice(2)) >= 0;
  return compareVersions(value, range) === 0;
}
