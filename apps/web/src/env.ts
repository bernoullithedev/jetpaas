import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  clientPrefix: "VITE_",
  client: {
    VITE_API_URL: z.string().url().default("http://localhost:4000"),
  },
  runtimeEnv: {
    ...process.env,
    ...import.meta.env,
  },
  emptyStringAsUndefined: true,
  skipValidation: import.meta.env.MODE === "test",
});
