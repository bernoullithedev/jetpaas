import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { env } from "./env.js";
import type { DeploymentRecord, DeploymentRow, DeploymentStatus } from "./types.js";
import { deploymentRecordSchema, deploymentSourceSchema } from "./types.js";

let db: DatabaseSync | null = null;

function rowToDeployment(row: DeploymentRow): DeploymentRecord {
  const source = deploymentSourceSchema.parse(JSON.parse(row.source));
  return deploymentRecordSchema.parse({
    id: row.id,
    name: row.name,
    source,
    status: row.status,
    imageTag: row.imageTag,
    liveUrl: row.liveUrl,
    createdAt: row.createdAt,
  });
}

export function initDatabase(): DatabaseSync {
  if (db) {
    return db;
  }

  const dbPath = env.SQLITE_PATH;
  if (dbPath !== ":memory:") {
    const directory = path.dirname(dbPath);
    if (directory !== ".") {
      mkdirSync(directory, { recursive: true });
    }
  }

  const connection = new DatabaseSync(dbPath);
  connection.exec("PRAGMA journal_mode = WAL;");
  connection.exec("PRAGMA foreign_keys = ON;");

  connection.exec(`
    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      imageTag TEXT,
      liveUrl TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deployment_logs (
      id TEXT PRIMARY KEY,
      deploymentId TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (deploymentId) REFERENCES deployments(id)
    );

    CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_id
    ON deployment_logs (deploymentId, createdAt);
  `);

  db = connection;
  return connection;
}

export function closeDatabase(): void {
  if (!db) {
    return;
  }

  db.close();
  db = null;
}

export function insertDeployment(deployment: DeploymentRecord): void {
  const connection = initDatabase();
  connection
    .prepare(
      `INSERT INTO deployments (id, name, source, status, imageTag, liveUrl, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      deployment.id,
      deployment.name,
      JSON.stringify(deployment.source),
      deployment.status,
      deployment.imageTag,
      deployment.liveUrl,
      deployment.createdAt,
    );
}

export function updateDeploymentStatus(id: string, status: DeploymentStatus): void {
  const deployment = getDeploymentById(id);
  if (!deployment) {
    throw new Error(`Deployment ${id} not found`);
  }
  const connection = initDatabase();
  connection
    .prepare(
      `UPDATE deployments SET status = ? WHERE id = ?`,
    )
    .run(status, id);
}
export function getDeploymentById(id: string): DeploymentRecord | null {
  const connection = initDatabase();
  const row = connection
    .prepare(
      `SELECT id, name, source, status, imageTag, liveUrl, createdAt
       FROM deployments
       WHERE id = ?`,
    )
    .get(id) as DeploymentRow | undefined;

  if (!row) {
    return null;
  }

  return rowToDeployment(row);
}

export function listDeployments(): DeploymentRecord[] {
  const connection = initDatabase();
  const rows = connection
    .prepare(
      `SELECT id, name, source, status, imageTag, liveUrl, createdAt
       FROM deployments
       ORDER BY createdAt DESC`,
    )
    .all() as DeploymentRow[];

  return rows.map(rowToDeployment);
}

export function appendDeploymentLog(
  deploymentId: string,
  content: string,
  createdAt = new Date().toISOString(),
): void {
  const connection = initDatabase();
  connection
    .prepare(
      `INSERT INTO deployment_logs (id, deploymentId, content, createdAt)
       VALUES (?, ?, ?, ?)`,
    )
    .run(randomUUID(), deploymentId, content, createdAt);
}

export function getDeploymentLogs(deploymentId: string): string[] {
  const connection = initDatabase();
  const rows = connection
    .prepare(
      `SELECT content
       FROM deployment_logs
       WHERE deploymentId = ?
       ORDER BY createdAt ASC`,
    )
    .all(deploymentId) as Array<{ content: string }>;

  return rows.map((row) => row.content);
}

export function clearDatabase(): void {
  const connection = initDatabase();
  connection.exec("DELETE FROM deployment_logs;");
  connection.exec("DELETE FROM deployments;");
}
