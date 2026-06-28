import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  appendDeploymentLog,
  clearDatabase,
  closeDatabase,
  getDeploymentById,
  getDeploymentLogs,
  initDatabase,
  insertDeployment,
  markDeploymentFailed,
  trimDeploymentLogs,
} from "./database.js";
import type { DeploymentRecord } from "./types.js";

function createPendingDeployment(id: string): DeploymentRecord {
  return {
    id,
    name: "demo-app",
    source: { type: "git", url: "https://github.com/jetpaas/demo-app.git" },
    status: "pending",
    imageTag: null,
    liveUrl: null,
    createdAt: new Date().toISOString(),
  };
}

describe("deployment failure helpers", () => {
  beforeAll(() => {
    initDatabase();
  });

  beforeEach(() => {
    clearDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  it("marks a deployment as failed", () => {
    insertDeployment(createPendingDeployment("abc12345"));
    markDeploymentFailed("abc12345");

    expect(getDeploymentById("abc12345")?.status).toBe("failed");
  });

  it("keeps only the newest log lines after trimming", () => {
    insertDeployment(createPendingDeployment("abc12345"));

    for (let index = 0; index < 105; index += 1) {
      appendDeploymentLog("abc12345", `line-${index}`, new Date(index).toISOString());
    }

    trimDeploymentLogs("abc12345", 100);

    const logs = getDeploymentLogs("abc12345");
    expect(logs).toHaveLength(100);
    expect(logs[0]).toBe("line-104");
    expect(logs.at(-1)).toBe("line-5");
  });
});
