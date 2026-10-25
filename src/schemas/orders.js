import { z } from "zod";
import { orderStatus } from "../db/schema.js";

export const createOrderSchema = z.object({
  shippingAddressId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        bookId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(100)
      })
    )
    .min(1, "Order must contain at least one item")
});

export const statusSchema = z.object({ status: z.enum(orderStatus.enumValues) });
