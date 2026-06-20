import { useState } from 'react'
import { GitBranch, Upload } from 'lucide-react'
import type { DeploymentSource } from '#/lib/deployments'

type DeploymentFormProps = {
  onSubmit: (source: DeploymentSource) => void
}

type FormMode = 'git' | 'upload'

export default function DeploymentForm({ onSubmit }: DeploymentFormProps) {
  const [mode, setMode] = useState<FormMode>('git')
  const [gitUrl, setGitUrl] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (mode === 'git') {
      const trimmed = gitUrl.trim()
      if (!trimmed) return
      onSubmit({ type: 'git', url: trimmed })
      setGitUrl('')
      return
    }

    if (!fileName) return
    onSubmit({ type: 'upload', filename: fileName })
    setFileName(null)
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setFileName(file?.name ?? null)
  }

  const canSubmit =
    mode === 'git' ? gitUrl.trim().length > 0 : fileName !== null

  return (
    <section className="demo-panel rise-in">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="island-kicker mb-1">New deployment</p>
          <h2 className="demo-section-title text-xl font-bold">Create deployment</h2>
        </div>
        <div className="inline-flex rounded-xl border border-[var(--line)] bg-[color-mix(in_oklab,var(--chip-bg)_88%,transparent)] p-1">
          <button
            type="button"
            onClick={() => setMode('git')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              mode === 'git'
                ? 'bg-[color-mix(in_oklab,var(--lagoon)_22%,var(--surface-strong))] text-[var(--sea-ink)]'
                : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
            }`}
          >
            <GitBranch size={14} />
            Git URL
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              mode === 'upload'
                ? 'bg-[color-mix(in_oklab,var(--lagoon)_22%,var(--surface-strong))] text-[var(--sea-ink)]'
                : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
            }`}
          >
            <Upload size={14} />
            Upload
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'git' ? (
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold tracking-wide text-[var(--sea-ink-soft)] uppercase">
              Repository URL
            </span>
            <input
              type="url"
              value={gitUrl}
              onChange={(event) => setGitUrl(event.target.value)}
              placeholder="https://github.com/org/project"
              className="demo-input font-mono text-sm"
              required
            />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold tracking-wide text-[var(--sea-ink-soft)] uppercase">
              Project archive
            </span>
            <div className="relative">
              <input
                type="file"
                accept=".zip,.tar,.tar.gz,.tgz"
                onChange={handleFileChange}
                className="demo-input cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-[color-mix(in_oklab,var(--lagoon)_18%,var(--surface-strong))] file:px-3 file:py-1 file:text-xs file:font-bold file:text-[var(--sea-ink)]"
              />
            </div>
            <p className="mt-2 text-xs text-[var(--sea-ink-soft)]">
              Upload support is wired in the API; file transfer lands in a later milestone (see TODO.md).
            </p>
          </label>
        )}

        <button type="submit" disabled={!canSubmit} className="demo-button">
          Deploy
        </button>
      </form>
    </section>
  )
}
