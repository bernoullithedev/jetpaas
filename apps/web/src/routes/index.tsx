import { createFileRoute } from '@tanstack/react-router'
import DeploymentForm from '#/components/DeploymentForm'
import DeploymentList from '#/components/DeploymentList'
import { useDeployments } from '#/lib/useDeployments'

export const Route = createFileRoute('/')({ component: DashboardPage })

function DashboardPage() {
  const { deployments, selectedId, setSelectedId, addDeployment } =
    useDeployments()

  const activeCount = deployments.filter(
    (d) =>
      d.status === 'pending' ||
      d.status === 'building' ||
      d.status === 'deploying',
  ).length

  const runningCount = deployments.filter((d) => d.status === 'running').length

  return (
    <main className="demo-page demo-page-wide px-4 pb-10">
      <header className="mb-8 pt-6 rise-in">
        <p className="island-kicker mb-2">Jetpaas</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display-title m-0 text-4xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
              Deployments
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--sea-ink-soft)]">
              Ship from Git or upload an archive. Monitor build output and rollout
              status in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="demo-pill">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-running)]" />
              {runningCount} running
            </span>
            <span className="demo-pill">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-building)]" />
              {activeCount} in progress
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <DeploymentForm onSubmit={addDeployment} />
        <DeploymentList
          deployments={deployments}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
    </main>
  )
}
