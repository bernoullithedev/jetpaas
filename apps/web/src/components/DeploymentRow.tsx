import { ChevronDown, ExternalLink } from 'lucide-react'
import LogStream from '#/components/LogStream'
import StatusBadge from '#/components/StatusBadge'
import type { Deployment } from '#/lib/deployments'
import { formatRelativeTime, sourceLabel } from '#/lib/deployments'

type DeploymentRowProps = {
  deployment: Deployment
  expanded: boolean
  onToggle: () => void
}

export default function DeploymentRow({
  deployment,
  expanded,
  onToggle,
}: DeploymentRowProps) {
  const isActive =
    deployment.status === 'pending' ||
    deployment.status === 'building' ||
    deployment.status === 'deploying'

  return (
    <article className="demo-list-item overflow-hidden transition-colors hover:border-[color-mix(in_oklab,var(--lagoon-deep)_28%,var(--line))]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-start gap-3 border-0 bg-transparent p-0 text-left"
        aria-expanded={expanded}
      >
        <span
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[color-mix(in_oklab,var(--chip-bg)_80%,transparent)] transition ${expanded ? 'rotate-180' : ''}`}
        >
          <ChevronDown size={14} className="text-[var(--sea-ink-soft)]" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 truncate text-base font-bold text-[var(--sea-ink)]">
              {deployment.name}
            </h3>
            <StatusBadge status={deployment.status} compact />
            <span className="text-xs text-[var(--sea-ink-soft)]">
              {formatRelativeTime(deployment.createdAt)}
            </span>
          </div>

          <p className="mt-1 truncate font-mono text-xs text-[var(--sea-ink-soft)]">
            {sourceLabel(deployment.source)}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {deployment.imageTag ? (
              <span className="font-mono text-[var(--sea-ink-soft)]">
                <span className="font-sans font-bold text-[var(--sea-ink)]">Image</span>{' '}
                {deployment.imageTag}
              </span>
            ) : null}
            {deployment.liveUrl ? (
              <a
                href={deployment.liveUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1 font-mono text-[var(--lagoon-deep)] no-underline hover:text-[var(--lagoon)]"
              >
                {deployment.liveUrl.replace('https://', '')}
                <ExternalLink size={12} />
              </a>
            ) : null}
          </div>
        </div>
      </button>

      {expanded ? (
        <LogStream deployment={deployment} streaming={isActive} />
      ) : null}
    </article>
  )
}
