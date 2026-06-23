import { Queue } from "bullmq";
import { createApp } from "./app.js";
import { initDatabase } from "./database.js";
import { env } from "./env.js";

const useTls = !["localhost", "127.0.0.1", "redis"].includes(env.REDIS_HOST);

const redis = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  ...(useTls ? { tls: {} } : {}),
};

const deployQueue = new Queue("deploy", { connection: redis });

await Promise.resolve(initDatabase());

const app = createApp({ deployQueue });

app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});
