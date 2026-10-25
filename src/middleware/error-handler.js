import { ZodError, z } from "zod";
import { HttpError } from "../lib/http-error.js";

// Postgres error codes we can explain to the client
const PG_ERRORS = {
  23505: [409, "A record with this value already exists"],
  23503: [409, "This record is referenced by other data and can't be changed or deleted"],
  23514: [400, "A value is out of the allowed range"]
};

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: z.flattenError(err).fieldErrors
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON body" });
  }

  // Drizzle wraps the pg error in `cause`
  const pgCode = err.cause?.code ?? err.code;
  if (PG_ERRORS[pgCode]) {
    const [status, message] = PG_ERRORS[pgCode];
    return res.status(status).json({ error: message });
  }

  // pino-http attaches this to the request completion log
  res.err = err;
  res.status(500).json({ error: "Internal server error" });
}
