import { env } from "./env.js";
import { Queue } from "bullmq";
import cors from "cors";
import express from "express";

const useTls = !["localhost", "127.0.0.1", "redis"].includes(env.REDIS_HOST);

const redis = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  ...(useTls ? { tls: {} } : {}),
};

const app = express();
const PORT = env.PORT;

app.use(cors());
app.use(express.json());


const deployQueue = new Queue("deploy", { connection: redis });

deployQueue.add("deploy", { repository: "https://github.com/jetpaas/api-gateway" });

app.post("/deploy", (req, res) => {
  const { repository } = req.body;
  deployQueue.add("deploy", { repository });
  res.json({ message: "Deploying..." });
});
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from Jetpaas API" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
