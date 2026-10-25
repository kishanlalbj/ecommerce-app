import express from "express";
import { pool } from "./db/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.js";
import { booksRouter } from "./routes/books.js";
import { meRouter } from "./routes/me.js";
import { ordersRouter } from "./routes/orders.js";

export const app = express();
app.use(express.json());

app.get("/health", async (req, res) => {
  await pool.query("select 1");
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/books", booksRouter);
app.use("/me", meRouter);
app.use("/orders", ordersRouter);

app.use(notFoundHandler);
app.use(errorHandler);
