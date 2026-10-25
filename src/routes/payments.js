import express, { Router } from "express";
import { env } from "../config/env.js";
import { badRequest } from "../lib/http-error.js";
import { onPaymentAbandoned, onPaymentSucceeded } from "../lib/payments.js";
import { stripe } from "../lib/stripe.js";

const handlers = {
  "checkout.session.completed": onPaymentSucceeded,
  "checkout.session.async_payment_succeeded": onPaymentSucceeded,
  "checkout.session.async_payment_failed": onPaymentAbandoned,
  "checkout.session.expired": onPaymentAbandoned
};

export const paymentsRouter = Router();

// Stripe signs the exact bytes it sent, so this route needs the raw body, not parsed JSON
paymentsRouter.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw badRequest("Invalid Stripe signature");
  }

  // Handlers are safe to replay; a thrown error returns 500 and Stripe retries later
  await handlers[event.type]?.(event.data.object);
  res.json({ received: true });
});
