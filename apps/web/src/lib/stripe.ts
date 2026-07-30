import Stripe from "stripe";

let client: Stripe | null = null;

export function hasStripe() {
  return /^sk_(?:test|live)_/.test(process.env.STRIPE_SECRET_KEY ?? "");
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true });
  return client;
}

export function stripeTaxEnabled() {
  return process.env.STRIPE_TAX_ENABLED === "true";
}

export function stripeBillingPortalConfiguration() {
  const value = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim();
  return value?.startsWith("bpc_") ? value : undefined;
}
