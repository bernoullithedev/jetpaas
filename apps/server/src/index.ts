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

// cors middleware allow all origins
app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization","Accept","Accept-Language","Accept-Encoding","Origin","Referer","User-Agent"],
  credentials: true,
  preflightContinue: false,
}));
app.use(express.json());


const deployQueue = new Queue("deploy", { connection: redis });

// deployQueue.add("deploy", { repository: "https://github.com/jetpaas/api-gateway" });

//generate deployment id
const generateDeploymentId = () => {
  return crypto.randomUUID().slice(0, 8);
};
function getDeploymentName(repository: string) {
  return repository.split("/").pop()?.replace(".git", "");
}

app.get("/",async (_req, res) => {
  const deployments = await deployQueue.getJobs();
  console.log("All deployments:", deployments);
  //sse stream deployments
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  for (const deployment of deployments) {
    res.write(`data: ${JSON.stringify(deployment.data)}\n\n`);
  }
  res.end();
});

app.post("/deploy", async (req, res) => {
  const { repository } = req.body;
  console.log(req.body);
  const id = generateDeploymentId();
  const name = getDeploymentName(repository)|| `New Deployment ${id}`;
  await deployQueue.add("deploy", 
    { repository,status: "pending", id, name,source: repository,createdAt: new Date().toISOString()});
  res.json({ status: "pending" });
  console.log(`Deployment ${name} added to queue`);
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
