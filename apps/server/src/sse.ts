import type { Response } from "express";
import { listDeployments } from "./database.js";

const clients = new Set<Response>();

export function registerSseClient(res: Response): void {
  clients.add(res);
  res.on("close", () => {
    clients.delete(res);
  });
}

export function broadcastDeploymentSnapshot(): void {
  if (clients.size === 0) {
    return;
  }

  const deployments = listDeployments();
  const payload = `event: snapshot\ndata: ${JSON.stringify({ deployments })}\n\n`;

  for (const client of clients) {
    client.write(payload);
  }
}
