import type { DeploymentStatus } from '#/lib/deployments'
import { STATUS_LABELS } from '#/lib/deployments'

const STATUS_STYLES: Record<
  DeploymentStatus,
  { dot: string; badge: string; pulse?: boolean }
> = {
  pending: {
    dot: 'bg-[var(--status-pending)]',
    badge:
      'border-[color-mix(in_oklab,var(--status-pending)_35%,var(--line))] bg-[color-mix(in_oklab,var(--status-pending)_12%,transparent)] text-[var(--status-pending)]',
  },
  building: {
    dot: 'bg-[var(--status-building)]',
    badge:
      'border-[color-mix(in_oklab,var(--status-building)_35%,var(--line))] bg-[color-mix(in_oklab,var(--status-building)_12%,transparent)] text-[var(--status-building)]',
    pulse: true,
  },
  deploying: {
    dot: 'bg-[var(--status-deploying)]',
    badge:
      'border-[color-mix(in_oklab,var(--status-deploying)_35%,var(--line))] bg-[color-mix(in_oklab,var(--status-deploying)_12%,transparent)] text-[var(--status-deploying)]',
    pulse: true,
  },
  running: {
    dot: 'bg-[var(--status-running)]',
    badge:
      'border-[color-mix(in_oklab,var(--status-running)_35%,var(--line))] bg-[color-mix(in_oklab,var(--status-running)_12%,transparent)] text-[var(--status-running)]',
  },
  failed: {
    dot: 'bg-[var(--status-failed)]',
    badge:
      'border-[color-mix(in_oklab,var(--status-failed)_35%,var(--line))] bg-[color-mix(in_oklab,var(--status-failed)_12%,transparent)] text-[var(--status-failed)]',
  },
}

type StatusBadgeProps = {
  status: DeploymentStatus
  compact?: boolean
}

export default function StatusBadge({ status, compact }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-bold tracking-wide uppercase ${styles.badge} ${compact ? 'px-2 py-0.5 text-[0.65rem]' : ''}`}
    >
      <span className="relative flex h-2 w-2">
        {styles.pulse ? (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${styles.dot}`}
          />
        ) : null}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${styles.dot}`} />
      </span>
      {STATUS_LABELS[status]}
    </span>
  )
}
