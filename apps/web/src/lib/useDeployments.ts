import { env } from '#/env'
import { useCallback, useEffect, useState } from 'react'
import type { Deployment, DeploymentSource } from '#/lib/deployments'

const API_URL = env.VITE_API_URL

type ApiDeployment = {
  id: string
  name: string
  source: DeploymentSource
  status: Deployment['status']
  imageTag: string | null
  liveUrl: string | null
  createdAt: string
  logs?: string[]
}

function apiDeploymentToDeployment(record: ApiDeployment): Deployment {
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

export function useDeployments() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDeployments() {
      const response = await fetch(`${API_URL}/api/deployments`)
      if (!response.ok || cancelled) return

      const data = (await response.json()) as { deployments: ApiDeployment[] }
      const next = data.deployments.map(apiDeploymentToDeployment)
      setDeployments(next)
      setSelectedId((current) => current ?? next[0]?.id ?? null)
    }

    void loadDeployments()

    const eventSource = new EventSource(`${API_URL}/api/deployments/events`)

    eventSource.addEventListener('snapshot', (event) => {
      const payload = JSON.parse(event.data) as { deployments: ApiDeployment[] }
      const next = payload.deployments.map(apiDeploymentToDeployment)
      setDeployments(next)
      setSelectedId((current) => current ?? next[0]?.id ?? null)
    })

    return () => {
      cancelled = true
      eventSource.close()
    }
  }, [])

  const addDeployment = useCallback(async (source: DeploymentSource) => {
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
    const deployment = apiDeploymentToDeployment(data.deployment)

    setDeployments((current) => [deployment, ...current])
    setSelectedId(deployment.id)
  }, [])

  return {
    deployments,
    selectedId,
    setSelectedId,
    addDeployment,
  }
}
