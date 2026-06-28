import { mkdirSync } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { Job, Queue, Worker } from "bullmq";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import {
  appendDeploymentLog,
  getDeploymentById,
  initDatabase,
  markDeploymentFailed,
  trimDeploymentLogs,
  updateDeploymentStatus,
} from "./database.js";
import { publishDeploymentUpdate } from "./events.js";
import { env } from "./env.js";
import { getRedisConnection } from "./redis.js";
import type { DeploymentRecord, DeploymentStatus } from "./types.js";

const TERMINAL_STATUSES = new Set<DeploymentStatus>(["running", "failed"]);
const deployQueue = new Queue("deploy", { connection: getRedisConnection() });

function workspacePath(deploymentId: string): string {
  return path.resolve(env.WORKSPACES_DIR, deploymentId);
}

function log(deploymentId: string, message: string): void {
  appendDeploymentLog(deploymentId, message);
}

async function notifyUpdate(deploymentId: string): Promise<void> {
  await publishDeploymentUpdate(deploymentId);
}

async function enqueueNextStage(deploymentId: string): Promise<void> {
  await deployQueue.add(
    "deploy",
    { deploymentId },
    {
      jobId: deploymentId,
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
}

async function failDeployment(
  deploymentId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  log(deploymentId, `[${new Date().toISOString()}] ✗ ${message}`);
  trimDeploymentLogs(deploymentId, env.MAX_FAILURE_LOG_LINES);
  markDeploymentFailed(deploymentId);
  await notifyUpdate(deploymentId);
}

async function advanceStatus(
  deploymentId: string,
  status: DeploymentStatus,
  message: string,
): Promise<void> {
  log(deploymentId, message);
  updateDeploymentStatus(deploymentId, status);
  await notifyUpdate(deploymentId);
}

async function fetchGitSource(deployment: DeploymentRecord): Promise<void> {
  const cloneDir = workspacePath(deployment.id);
  mkdirSync(cloneDir, { recursive: true });

  log(
    deployment.id,
    `Cloning repository ${deployment.source.type === "git" ? deployment.source.url : ""}`,
  );

  if (deployment.source.type !== "git") {
    throw new Error("Expected git source");
  }

  await git.clone({
    fs,
    http,
    dir: cloneDir,
    url: deployment.source.url,
    depth: 1,
    onProgress: (progress) => {
      log(
        deployment.id,
        `[${new Date().toISOString()}] Cloning: ${progress.phase} ${progress.loaded}/${progress.total}`,
      );
    },
    onMessage: (message) => {
      log(deployment.id, `[${new Date().toISOString()}] ${message}`);
    },
  });
}

async function fetchUploadSource(deployment: DeploymentRecord): Promise<void> {
  const sourceDir = workspacePath(deployment.id);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(
      "Upload workspace not found. Wire POST /api/deployments/upload to create a deployment record (Phase 7).",
    );
  }

  log(deployment.id, `Using uploaded source at ${sourceDir}`);
}

async function pendingToBuilding(deployment: DeploymentRecord): Promise<void> {
  if (deployment.source.type === "git") {
    await fetchGitSource(deployment);
  } else {
    await fetchUploadSource(deployment);
  }

  await advanceStatus(
    deployment.id,
    "building",
    `[${new Date().toISOString()}] Status: Pending → Building`,
  );
}

async function buildingToDeploying(deployment: DeploymentRecord): Promise<void> {
  // Phase 3: invoke Railpack here.
  log(
    deployment.id,
    `[${new Date().toISOString()}] Railpack build not implemented yet (Phase 3)`,
  );
  await advanceStatus(
    deployment.id,
    "deploying",
    `[${new Date().toISOString()}] Status: Building → Deploying (stub)`,
  );
}

async function deployingToRunning(deployment: DeploymentRecord): Promise<void> {
  // Phase 4: docker run the built image here.
  log(
    deployment.id,
    `[${new Date().toISOString()}] Docker deploy not implemented yet (Phase 4)`,
  );
  await advanceStatus(
    deployment.id,
    "running",
    `[${new Date().toISOString()}] Status: Deploying → Running (stub)`,
  );
}

async function processDeployment(deploymentId: string): Promise<void> {
  const deployment = getDeploymentById(deploymentId);
  if (!deployment) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  if (TERMINAL_STATUSES.has(deployment.status)) {
    return;
  }

  switch (deployment.status) {
    case "pending":
      await pendingToBuilding(deployment);
      await enqueueNextStage(deploymentId);
      return;
    case "building":
      await buildingToDeploying(deployment);
      await enqueueNextStage(deploymentId);
      return;
    case "deploying":
      await deployingToRunning(deployment);
      return;
    default:
      throw new Error(`Unknown deployment status: ${deployment.status}`);
  }
}

await Promise.resolve(initDatabase());

const worker = new Worker(
  "deploy",
  async (job: Job) => {
    const deploymentId = job.data.deploymentId as string;

    try {
      await processDeployment(deploymentId);
    } catch (error) {
      await failDeployment(deploymentId, error);
      throw error;
    }
  },
  { connection: getRedisConnection() },
);

worker.on("error", (error) => {
  console.error("Worker error", error);
});

worker.on("ready", () => {
  console.log("Worker ready");
});

async function shutdown(): Promise<void> {
  await worker.close();
  await deployQueue.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
