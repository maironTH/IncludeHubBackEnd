// src/server.ts
import 'dotenv-safe/config';
import { app } from "./app";

app.listen(3000, () => {
  console.log("API em http://localhost:3000");
});