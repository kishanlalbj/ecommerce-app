// Parses req.body / req.params / req.query with zod schemas and replaces them
// with the parsed values, so handlers only ever see validated, typed input
export function validate({ body, params, query }) {
  return (req, res, next) => {
    if (body) req.body = body.parse(req.body ?? {});
    if (params) req.params = params.parse(req.params);
    // req.query is a getter in Express 5, so validated query goes on its own property
    if (query) req.validatedQuery = query.parse(req.query);
    next();
  };
}
