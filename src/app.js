import express from "express";
import swaggerUi from "swagger-ui-express";
import { pool } from "./db/index.js";
import { openApiSpec } from "./docs/openapi.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { authRouter } from "./routes/auth.js";
import { booksRouter } from "./routes/books.js";
import { meRouter } from "./routes/me.js";
import { ordersRouter } from "./routes/orders.js";
import { paymentsRouter } from "./routes/payments.js";

export const app = express();
app.use(requestLogger);
// Before express.json(): webhook signatures are checked against the raw body
app.use("/payments", paymentsRouter);
app.use(express.json());

app.get("/health", async (req, res) => {
  await pool.query("select 1");
  res.json({ status: "ok" });
});

// Interactive API docs; the raw spec is at /docs.json for Postman, codegen, etc.
app.get("/docs.json", (req, res) => res.json(openApiSpec));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { swaggerOptions: { persistAuthorization: true } }));

app.use("/auth", authRouter);
app.use("/books", booksRouter);
app.use("/me", meRouter);
app.use("/orders", ordersRouter);

app.use(notFoundHandler);
app.use(errorHandler);
