import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { clearDatabase, closeDatabase, initDatabase } from "./database.js";

const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: "test-job" }),
};

describe("deployments API", () => {
  beforeAll(() => {
    initDatabase();
  });

  beforeEach(() => {
    clearDatabase();
    mockQueue.add.mockClear();
  });

  afterAll(() => {
    closeDatabase();
  });

  it("creates a deployment from a git repository", async () => {
    const app = createApp({ deployQueue: mockQueue });

    const response = await request(app)
      .post("/api/deployments")
      .send({ repository: "https://github.com/jetpaas/demo-app.git" })
      .expect(201);

    expect(response.body.deployment).toMatchObject({
      name: "demo-app",
      status: "pending",
      source: {
        type: "git",
        url: "https://github.com/jetpaas/demo-app.git",
      },
      imageTag: null,
      liveUrl: null,
    });
    expect(mockQueue.add).toHaveBeenCalledOnce();
  });

  it("lists deployments newest first", async () => {
    const app = createApp({ deployQueue: mockQueue });

    await request(app)
      .post("/api/deployments")
      .send({ repository: "https://github.com/jetpaas/first.git" });

    await request(app)
      .post("/api/deployments")
      .send({ filename: "second.zip" });

    const response = await request(app).get("/api/deployments").expect(200);

    expect(response.body.deployments).toHaveLength(2);
    expect(response.body.deployments[0].source).toEqual({
      type: "upload",
      filename: "second.zip",
    });
    expect(response.body.deployments[1].source).toEqual({
      type: "git",
      url: "https://github.com/jetpaas/first.git",
    });
  });

  it("returns 400 for an invalid request body", async () => {
    const app = createApp({ deployQueue: mockQueue });

    const response = await request(app)
      .post("/api/deployments")
      .send({})
      .expect(400);

    expect(response.body.error).toBe("Invalid deployment request");
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it("returns a deployment by id with logs", async () => {
    const app = createApp({ deployQueue: mockQueue });

    const created = await request(app)
      .post("/api/deployments")
      .send({ repository: "https://github.com/jetpaas/detail.git" })
      .expect(201);

    const id = created.body.deployment.id as string;

    const response = await request(app)
      .get(`/api/deployments/${id}`)
      .expect(200);

    expect(response.body.deployment.id).toBe(id);
    expect(response.body.deployment.logs).toEqual(
      expect.arrayContaining([expect.stringContaining(`Deployment ${id} created`)]),
    );
  });

  it("returns deployment logs from the logs endpoint", async () => {
    const app = createApp({ deployQueue: mockQueue });

    const created = await request(app)
      .post("/api/deployments")
      .send({ filename: "bundle.zip" })
      .expect(201);

    const id = created.body.deployment.id as string;

    const response = await request(app)
      .get(`/api/deployments/${id}/logs`)
      .expect(200);

    expect(response.body.logs).toEqual(
      expect.arrayContaining([expect.stringContaining(`Deployment ${id} created`)]),
    );
  });

  it("returns 404 for unknown deployment routes", async () => {
    const app = createApp({ deployQueue: mockQueue });

    await request(app).get("/api/deployments/missing").expect(404);
    await request(app).get("/api/deployments/missing/logs").expect(404);
  });
});
