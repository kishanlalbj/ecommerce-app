import { env } from "./src/config/env.js";
import { app } from "./src/app.js";

app.listen(env.PORT, () => console.log(`Server listening on port ${env.PORT}`));
