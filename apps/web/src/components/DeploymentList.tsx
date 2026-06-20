import DeploymentRow from '#/components/DeploymentRow'
import type { Deployment } from '#/lib/deployments'

type DeploymentListProps = {
  deployments: Deployment[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function DeploymentList({
  deployments,
  selectedId,
  onSelect,
}: DeploymentListProps) {
  return (
    <section className="demo-panel rise-in" style={{ animationDelay: '80ms' }}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="island-kicker mb-1">Fleet</p>
          <h2 className="demo-section-title text-xl font-bold">
            Deployments
            <span className="ml-2 font-mono text-sm font-semibold text-[var(--sea-ink-soft)]">
              {deployments.length}
            </span>
          </h2>
        </div>
      </div>

      {deployments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] px-6 py-10 text-center">
          <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
            No deployments yet. Create one above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deployments.map((deployment) => (
            <DeploymentRow
              key={deployment.id}
              deployment={deployment}
              expanded={selectedId === deployment.id}
              onToggle={() =>
                onSelect(selectedId === deployment.id ? null : deployment.id)
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}
