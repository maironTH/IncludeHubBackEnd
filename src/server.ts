// src/server.ts
import { config } from "./lib/config";
import { app } from "./app";

app.listen(config.PORT, () => {
  console.log(`API em http://localhost:${config.PORT}`);
});