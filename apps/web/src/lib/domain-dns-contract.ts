import { courierDomain } from "@/lib/domain-registry";

export type HostingDnsRecord = { id?: string; name?: string; type?: string; content?: string; disabled?: boolean };
const normalized = (value: string) => value.toLowerCase().replace(/\.$/, "");

export function allowedDomainDnsApi(value: string | undefined) {
  const url = (value ?? "https://api.hosting.ionos.com/dns").replace(/\/$/, "");
  if (url !== "https://api.hosting.ionos.com/dns") {
    throw new Error("The DNS API must be an approved IONOS provider endpoint");
  }
  return url;
}

export function validateVercelCnameTarget(target: string) {
  const value = normalized(target);
  if (!/^[a-z0-9-]+\.vercel-dns(?:-\d+)?\.com$/.test(value)) {
    throw new Error("The provider did not return a supported Vercel DNS target");
  }
  return value;
}

export function planHostingCname(zone: { name?: string; records?: HostingDnsRecord[] }, label: string, target: string) {
  if (normalized(zone.name ?? "") !== courierDomain) throw new Error("The configured DNS zone is not the Courier zone");
  if (!/^[a-z0-9-]+$/.test(label)) throw new Error("Invalid DNS label");
  const hostname = `${label}.${courierDomain}`;
  const content = validateVercelCnameTarget(target);
  const matches = (zone.records ?? []).filter((record) => normalized(record.name ?? "") === hostname);
  if (matches.length === 1 && matches[0].type === "CNAME" && normalized(matches[0].content ?? "") === content && !matches[0].disabled) {
    return { existingId: matches[0].id ?? null, record: null };
  }
  if (matches.length) throw new Error("Existing DNS records conflict with this change. Review them at IONOS; Studio will not replace or deactivate them");
  return { existingId: null, record: { name: hostname, type: "CNAME", content, ttl: 300, disabled: false } };
}
