import { Redis } from "ioredis";
import { getRedisConfig } from "./redis.js";

export const DEPLOYMENTS_UPDATED_CHANNEL = "deployments:updated";

export async function publishDeploymentUpdate(deploymentId: string): Promise<void> {
  const publisher = new Redis(getRedisConfig());

  try {
    await publisher.publish(
      DEPLOYMENTS_UPDATED_CHANNEL,
      JSON.stringify({ deploymentId }),
    );
  } finally {
    await publisher.quit();
  }
}

export function subscribeToDeploymentUpdates(
  onUpdate: (deploymentId: string) => void,
): Redis {
  const subscriber = new Redis(getRedisConfig());

  void subscriber.subscribe(DEPLOYMENTS_UPDATED_CHANNEL);
  subscriber.on("message", (_channel: string, message: string) => {
    try {
      const payload = JSON.parse(message) as { deploymentId?: string };
      if (payload.deploymentId) {
        onUpdate(payload.deploymentId);
      }
    } catch {
      onUpdate("");
    }
  });

  return subscriber;
}
