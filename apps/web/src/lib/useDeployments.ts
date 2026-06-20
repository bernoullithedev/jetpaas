import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createDeployment,
  failureLog,
  formatTime,
  generateImageTag,
  generateLiveUrl,
  getNextStatus,
  INITIAL_DEPLOYMENTS,
  nextLogLine,
  statusDurationMs,
  statusTransitionLog,
  type Deployment,
  type DeploymentSource,
} from '#/lib/deployments'

const LOG_INTERVAL_MS = 900
const FAIL_CHANCE = 0.08

export function useDeployments() {
  const [deployments, setDeployments] = useState<Deployment[]>(INITIAL_DEPLOYMENTS)
  const [selectedId, setSelectedId] = useState<string | null>(
    INITIAL_DEPLOYMENTS[0]?.id ?? null,
  )
  const logIndices = useRef<Record<string, number>>({})

  const addDeployment = useCallback(async (source: DeploymentSource) => {
    // const deployment = createDeployment(source)
    // setDeployments((current) => [deployment, ...current])
    // setSelectedId(deployment.id)
    console.log(source);
    if (source.type === 'git') {
      const response = await fetch(`http://localhost:4000/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repository: source.url }),
      })
    } else {
      const response = await fetch(`http://localhost:4000/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: source.filename }),
      })
    }
    // const data = await response.json()
    // setDeployments((current) => [data, ...current])
    // setSelectedId(data.id)
  }, [])

  useEffect(() => {
    const cleanups: Array<() => void> = []

    for (const deployment of deployments) {
      if (deployment.status === 'running' || deployment.status === 'failed') {
        continue
      }

      const phaseKey = `${deployment.id}:${deployment.status}`
      if (!(phaseKey in logIndices.current)) {
        logIndices.current[phaseKey] = 0
      }

      const logInterval = setInterval(() => {
        setDeployments((current) => {
          const active = current.find((item) => item.id === deployment.id)
          if (
            !active ||
            active.status === 'running' ||
            active.status === 'failed'
          ) {
            return current
          }

          const index = logIndices.current[phaseKey] ?? 0
          const line = nextLogLine(active.status, index)
          if (!line) return current

          logIndices.current[phaseKey] = index + 1
          return current.map((item) =>
            item.id === deployment.id
              ? { ...item, logs: [...item.logs, line] }
              : item,
          )
        })
      }, LOG_INTERVAL_MS)

      const statusTimer = setTimeout(() => {
        setDeployments((current) => {
          const active = current.find((item) => item.id === deployment.id)
          if (!active || active.status !== deployment.status) {
            return current
          }

          const shouldFail =
            active.status === 'deploying' && Math.random() < FAIL_CHANCE

          if (shouldFail) {
            return current.map((item) =>
              item.id === deployment.id
                ? {
                    ...item,
                    status: 'failed' as const,
                    logs: [...item.logs, failureLog()],
                  }
                : item,
            )
          }

          const next = getNextStatus(active.status)
          if (!next) return current

          const transitionLine = statusTransitionLog(active.status, next)
          const liveUrl = next === 'running' ? generateLiveUrl(active.name) : null
          const extraLogs: string[] = [transitionLine]

          if (liveUrl) {
            extraLogs.push(`[${formatTime()}] Live at ${liveUrl}`)
          }

          return current.map((item) =>
            item.id === deployment.id
              ? {
                  ...item,
                  status: next,
                  imageTag:
                    next === 'running'
                      ? generateImageTag(item.id)
                      : item.imageTag,
                  liveUrl: liveUrl ?? item.liveUrl,
                  logs: [...item.logs, ...extraLogs],
                }
              : item,
          )
        })
      }, statusDurationMs(deployment.status))

      cleanups.push(() => {
        clearInterval(logInterval)
        clearTimeout(statusTimer)
      })
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup()
      }
    }
  }, [
    deployments
      .map((deployment) => `${deployment.id}:${deployment.status}`)
      .join('|'),
  ])

  return {
    deployments,
    selectedId,
    setSelectedId,
    addDeployment,
  }
}
