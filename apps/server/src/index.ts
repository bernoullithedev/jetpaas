import { env } from "./env.js";
import { Queue } from "bullmq";
import cors from "cors";
import express from "express";
import { z } from "zod";

const useTls = !["localhost", "127.0.0.1", "redis"].includes(env.REDIS_HOST);

const redis = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  ...(useTls ? { tls: {} } : {}),
};

const deploymentStatusSchema = z.enum([
  "pending",
  "building",
  "deploying",
  "running",
  "failed",
]);

const deploymentRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.union([
    z.object({ type: z.literal("git"), url: z.string().url() }),
    z.object({ type: z.literal("upload"), filename: z.string().min(1) }),
  ]),
  status: deploymentStatusSchema,
  imageTag: z.string().nullable().default(null),
  liveUrl: z.string().nullable().default(null),
  createdAt: z.string(),
});

type DeploymentRecord = z.infer<typeof deploymentRecordSchema>;

const createDeploymentSchema = z
  .object({
    repository: z.string().url().optional(),
    filename: z.string().min(1).optional(),
  })
  .refine(
    (value) => Boolean(value.repository ?? value.filename),
    "Provide either repository (Git URL) or filename (upload)",
  );

const app = express();
const PORT = env.PORT;

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
  }),
);
app.use(express.json());

const deployQueue = new Queue("deploy", { connection: redis });

function generateDeploymentId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function getDeploymentName(repository: string): string {
  return repository.split("/").pop()?.replace(".git", "") ?? "app";
}

async function listDeployments(): Promise<DeploymentRecord[]> {
  const jobs = await deployQueue.getJobs([
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
    "paused",
  ]);

  return jobs
    .map((job) => deploymentRecordSchema.safeParse(job.data))
    .filter((result) => result.success)
    .map((result) => result.data)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}

async function createDeployment(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const parsed = createDeploymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid deployment request",
      details: parsed.error.flatten(),
    });
    return;
  }

  const id = generateDeploymentId();
  const createdAt = new Date().toISOString();

  const deployment: DeploymentRecord = parsed.data.repository
    ? {
        id,
        name: getDeploymentName(parsed.data.repository),
        source: { type: "git", url: parsed.data.repository },
        status: "pending",
        imageTag: null,
        liveUrl: null,
        createdAt,
      }
    : {
        id,
        name: parsed.data.filename!.replace(/\.(zip|tar|tar\.gz|tgz)$/i, ""),
        source: { type: "upload", filename: parsed.data.filename! },
        status: "pending",
        imageTag: null,
        liveUrl: null,
        createdAt,
      };

  await deployQueue.add("deploy", deployment, { jobId: id });
  res.status(201).json({ deployment });
}

async function deploymentEvents(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendSnapshot = async () => {
    const deployments = await listDeployments();
    res.write(`event: snapshot\ndata: ${JSON.stringify({ deployments })}\n\n`);
  };

  await sendSnapshot();

  const heartbeat = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15_000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/deployments", async (_req, res) => {
  const deployments = await listDeployments();
  res.json({ deployments });
});

app.post("/api/deployments", createDeployment);

app.get("/api/deployments/events", deploymentEvents);

// Temporary alias while older clients migrate to /api/deployments.
app.post("/deploy", createDeployment);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
