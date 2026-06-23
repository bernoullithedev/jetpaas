import { env } from '#/env'
import type { Deployment, DeploymentSource } from '#/lib/deployments'

const API_URL = env.VITE_API_URL

export type ApiDeployment = {
  id: string
  name: string
  source: DeploymentSource
  status: Deployment['status']
  imageTag: string | null
  liveUrl: string | null
  createdAt: string
  logs?: string[]
}

export function apiDeploymentToDeployment(record: ApiDeployment): Deployment {
  return {
    id: record.id,
    name: record.name,
    source: record.source,
    status: record.status,
    imageTag: record.imageTag,
    liveUrl: record.liveUrl,
    createdAt: new Date(record.createdAt).getTime(),
    logs: record.logs ?? [],
  }
}

export async function fetchDeployments(): Promise<Deployment[]> {
  const response = await fetch(`${API_URL}/api/deployments`)
  if (!response.ok) {
    throw new Error('Failed to load deployments')
  }

  const data = (await response.json()) as { deployments: ApiDeployment[] }
  return data.deployments.map(apiDeploymentToDeployment)
}

export async function fetchDeploymentLogs(
  deploymentId: string,
): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/deployments/${deploymentId}/logs`)
  if (!response.ok) {
    throw new Error('Failed to load deployment logs')
  }

  const data = (await response.json()) as { logs: string[] }
  return data.logs
}

export async function createDeploymentRequest(
  source: DeploymentSource,
): Promise<Deployment> {
  const response = await fetch(`${API_URL}/api/deployments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      source.type === 'git'
        ? { repository: source.url }
        : { filename: source.filename },
    ),
  })

  if (!response.ok) {
    throw new Error('Failed to create deployment')
  }

  const data = (await response.json()) as { deployment: ApiDeployment }
  return apiDeploymentToDeployment(data.deployment)
}

export const deploymentKeys = {
  all: ['deployments'] as const,
  logs: (deploymentId: string) =>
    ['deployments', deploymentId, 'logs'] as const,
}
