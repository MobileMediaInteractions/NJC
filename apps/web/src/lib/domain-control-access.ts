export const domainControlOwnerEmail = "alanmichaelsen12@gmail.com";

export function isVerifiedDomainControlOwner(input: {
  clerkId: string;
  identityClerkId: string;
  role: string;
  email: string;
  emailVerified: boolean;
}, pinnedClerkIds: readonly string[] = []) {
  return Boolean(input.clerkId && input.clerkId === input.identityClerkId &&
    input.role === "admin" && input.emailVerified &&
    input.email.trim().toLowerCase() === domainControlOwnerEmail &&
    (!pinnedClerkIds.length || pinnedClerkIds.includes(input.clerkId)));
}

export function isSameOriginDomainMutation(request: Request, production = process.env.NODE_ENV === "production") {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host")?.toLowerCase();
  if (!origin || !host || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    const url = new URL(origin);
    return url.origin === origin && url.host.toLowerCase() === host &&
      (production ? origin === "https://studio.thejerseycourier.com" :
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || origin === "https://studio.thejerseycourier.com");
  } catch {
    return false;
  }
}

export function safeDomainControlError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/^(Vercel returned \d{3}\.|IONOS DNS returned \d{3}\.|Existing DNS records conflict |The configured DNS zone is not |The DNS API must be |The provider did not return a supported |Vercel did not return a recommended CNAME)/.test(message)) return message;
  return "Domain provisioning could not complete. Refresh provider status before creating a new preview; a partial change may have occurred";
}
