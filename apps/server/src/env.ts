import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(4000),
    REDIS_HOST: z.string().min(1),
    REDIS_PORT: z.coerce.number(),
    REDIS_PASSWORD: z.string().min(1),
    CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
    SQLITE_PATH: z.string().min(1).default("./data/jetpaas.db"),
    WORKSPACES_DIR: z.string().min(1).default("./workspaces"),
    MAX_FAILURE_LOG_LINES: z.coerce.number().int().positive().default(100),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
