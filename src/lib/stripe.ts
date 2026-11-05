import Stripe from "stripe";

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

export const stripe = () => {
  if (!stripeEnabled()) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
};
