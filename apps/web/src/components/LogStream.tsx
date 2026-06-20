import { useEffect, useRef } from 'react'
import type { Deployment } from '#/lib/deployments'

type LogStreamProps = {
  deployment: Deployment
  streaming: boolean
}

export default function LogStream({ deployment, streaming }: LogStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [deployment.logs.length])

  return (
    <div className="log-terminal mt-3 overflow-hidden rounded-xl border border-[var(--line)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--chip-bg)_90%,transparent)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="log-dot log-dot-red" />
          <span className="log-dot log-dot-amber" />
          <span className="log-dot log-dot-green" />
          <span className="ml-2 font-mono text-[0.68rem] font-semibold tracking-wider text-[var(--sea-ink-soft)] uppercase">
            build output
          </span>
        </div>
        {streaming ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] text-[var(--lagoon-deep)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--lagoon)]" />
            streaming
          </span>
        ) : (
          <span className="font-mono text-[0.65rem] text-[var(--sea-ink-soft)]">
            {deployment.logs.length} lines
          </span>
        )}
      </div>
      <div ref={scrollRef} className="log-scroll max-h-56 overflow-y-auto p-3">
        {deployment.logs.length === 0 ? (
          <p className="m-0 font-mono text-sm text-[var(--sea-ink-soft)]">
            Waiting for logs…
          </p>
        ) : (
          deployment.logs.map((line, index) => (
            <div
              key={`${deployment.id}-${index}`}
              className={`log-line font-mono text-[0.78rem] leading-relaxed ${
                line.includes('✗')
                  ? 'text-[var(--status-failed)]'
                  : line.includes('✓')
                    ? 'text-[var(--status-running)]'
                    : 'text-[var(--sea-ink-soft)]'
              }`}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
