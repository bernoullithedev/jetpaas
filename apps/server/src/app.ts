import type { Queue } from "bullmq";
import cors from "cors";
import express from "express";
import {
  appendDeploymentLog,
  getDeploymentById,
  getDeploymentLogs,
  insertDeployment,
  listDeployments,
} from "./database.js";
import { env } from "./env.js";
import type { DeploymentRecord } from "./types.js";
import { createDeploymentSchema } from "./types.js";

type CreateAppOptions = {
  deployQueue: Pick<Queue, "add">;
};

function generateDeploymentId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function getDeploymentName(repository: string): string {
  return repository.split("/").pop()?.replace(".git", "") ?? "app";
}

function formatCreationLog(id: string, createdAt: string): string {
  const time = new Date(createdAt).toLocaleTimeString("en-US", {
    hour12: false,
  });
  return `[${time}] Deployment ${id} created`;
}

export function createApp({ deployQueue }: CreateAppOptions): express.Application {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Accept"],
    }),
  );
  app.use(express.json());

  const createDeploymentHandler = async (
    req: express.Request,
    res: express.Response,
  ): Promise<void> => {
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

    insertDeployment(deployment);
    appendDeploymentLog(
      deployment.id,
      formatCreationLog(deployment.id, createdAt),
      createdAt,
    );
    await deployQueue.add("deploy", { deploymentId: deployment.id }, { jobId: id });

    res.status(201).json({ deployment });
  };

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/deployments", (_req, res) => {
    const deployments = listDeployments();
    res.json({ deployments });
  });

  app.get("/api/deployments/events", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const sendSnapshot = () => {
      const deployments = listDeployments();
      res.write(`event: snapshot\ndata: ${JSON.stringify({ deployments })}\n\n`);
    };

    sendSnapshot();

    const heartbeat = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 15_000);

    req.on("close", () => {
      clearInterval(heartbeat);
    });
  });

  app.get("/api/deployments/:id", (req, res) => {
    const deployment = getDeploymentById(req.params.id);
    if (!deployment) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }

    const logs = getDeploymentLogs(deployment.id);
    res.json({ deployment: { ...deployment, logs } });
  });

  app.get("/api/deployments/:id/logs", (req, res) => {
    const deployment = getDeploymentById(req.params.id);
    if (!deployment) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }

    const logs = getDeploymentLogs(deployment.id);
    res.json({ logs });
  });

  app.post("/api/deployments", createDeploymentHandler);

  return app;
}
