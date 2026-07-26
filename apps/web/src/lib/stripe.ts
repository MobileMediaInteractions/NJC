import Stripe from "stripe";

let client: Stripe | null = null;

export function hasStripe() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true });
  return client;
}
