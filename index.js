import { env } from "./src/config/env.js";
import { app } from "./src/app.js";
import { connectCache } from "./src/lib/cache.js";
import { logger } from "./src/lib/logger.js";

connectCache();

app.listen(env.PORT, () => logger.info({ env: env.NODE_ENV }, `Server listening on port ${env.PORT}`));

process.on("unhandledRejection", (err) => {
  logger.fatal({ err }, "Unhandled promise rejection");
  process.exit(1);
});
