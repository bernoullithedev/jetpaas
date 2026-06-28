import type { ConnectionOptions } from "bullmq";
import { env } from "./env.js";

export type RedisConfig = {
  host: string;
  port: number;
  password: string;
  tls?: Record<string, never>;
};

function useTls(host: string): boolean {
  return !["localhost", "127.0.0.1", "redis"].includes(host);
}

export function getRedisConfig(): RedisConfig {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    ...(useTls(env.REDIS_HOST) ? { tls: {} } : {}),
  };
}

export function getRedisConnection(): ConnectionOptions {
  return getRedisConfig();
}
