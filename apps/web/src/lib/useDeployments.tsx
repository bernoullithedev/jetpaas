import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import {
  createDeploymentRequest,
  deploymentKeys,
  fetchDeploymentLogs,
  fetchDeployments,
} from '#/lib/deployment-api'
import { env } from '#/env'
import type { Deployment, DeploymentSource } from '#/lib/deployments'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
    },
  },
})

export function DeploymentsQueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

export function useDeployments() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const deploymentsQuery = useQuery({
    queryKey: deploymentKeys.all,
    queryFn: fetchDeployments,
  })

  const createMutation = useMutation({
    mutationFn: createDeploymentRequest,
    onSuccess: (deployment) => {
      queryClient.setQueryData<Deployment[]>(deploymentKeys.all, (current) => [
        deployment,
        ...(current ?? []),
      ])
      setSelectedId(deployment.id)
    },
  })

  useEffect(() => {
    const eventSource = new EventSource(
      `${env.VITE_API_URL}/api/deployments/events`,
    )

    eventSource.addEventListener('snapshot', () => {
      void queryClient.invalidateQueries({ queryKey: deploymentKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['deployments'] })
    })

    return () => {
      eventSource.close()
    }
  }, [queryClient])

  const addDeployment = useCallback(
    async (source: DeploymentSource) => {
      await createMutation.mutateAsync(source)
    },
    [createMutation],
  )

  return {
    deployments: deploymentsQuery.data ?? [],
    isLoading: deploymentsQuery.isLoading,
    selectedId,
    setSelectedId,
    addDeployment,
    isCreating: createMutation.isPending,
  }
}

export function useDeploymentLogs(deploymentId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: deploymentId ? deploymentKeys.logs(deploymentId) : ['deployments', 'logs', 'none'],
    queryFn: () => fetchDeploymentLogs(deploymentId!),
    enabled: enabled && deploymentId !== null,
  })
}
