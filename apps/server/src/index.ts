import { Queue } from "bullmq";
import { createApp } from "./app.js";
import { initDatabase } from "./database.js";
import { subscribeToDeploymentUpdates } from "./events.js";
import { env } from "./env.js";
import { getRedisConnection } from "./redis.js";
import { broadcastDeploymentSnapshot } from "./sse.js";

const deployQueue = new Queue("deploy", { connection: getRedisConnection() });

await Promise.resolve(initDatabase());

const app = createApp({ deployQueue });

subscribeToDeploymentUpdates(() => {
  broadcastDeploymentSnapshot();
});

app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});
