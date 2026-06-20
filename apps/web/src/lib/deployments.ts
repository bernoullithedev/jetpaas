export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'running'
  | 'failed'

export type DeploymentSource =
  | { type: 'git'; url: string }
  | { type: 'upload'; filename: string }

export type Deployment = {
  id: string
  name: string
  source: DeploymentSource
  status: DeploymentStatus
  imageTag: string | null
  liveUrl: string | null
  createdAt: number
  logs: string[]
}

export const STATUS_SEQUENCE: DeploymentStatus[] = [
  'pending',
  'building',
  'deploying',
  'running',
]

export const STATUS_LABELS: Record<DeploymentStatus, string> = {
  pending: 'Pending',
  building: 'Building',
  deploying: 'Deploying',
  running: 'Running',
  failed: 'Failed',
}

const BUILD_LOGS = [
  '→ Resolving build context',
  '→ Fetching base image node:22-alpine',
  '→ COPY package.json pnpm-lock.yaml',
  '→ RUN pnpm install --frozen-lockfile',
  '→ COPY . .',
  '→ RUN pnpm build',
  '✓ Build completed in 42s',
]

const DEPLOY_LOGS = [
  '→ Pushing image to registry',
  '→ Creating deployment revision',
  '→ Allocating compute (512Mi / 0.5 CPU)',
  '→ Running health checks on /health',
  '→ Routing traffic to edge',
  '✓ Deployment live',
]

const PENDING_LOGS = [
  '→ Queued for build worker',
  '→ Assigned to builder-us-east-1',
]

export function generateId(): string {
  return crypto.randomUUID().slice(0, 8)
}

export function generateImageTag(id: string): string {
  return `jetpaas/app:${id}`
}

export function generateLiveUrl(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `https://${slug || 'app'}-${generateId().slice(0, 6)}.jetpaas.dev`
}

export function sourceLabel(source: DeploymentSource): string {
  return source.type === 'git' ? source.url : source.filename
}

export function deploymentName(source: DeploymentSource): string {
  if (source.type === 'git') {
    const match = source.url.match(/\/([^/]+?)(?:\.git)?$/)
    return match?.[1] ?? 'app'
  }
  return source.filename.replace(/\.(zip|tar|tar\.gz|tgz)$/i, '')
}

export function createDeployment(source: DeploymentSource): Deployment {
  const id = generateId()
  const name = deploymentName(source)
  return {
    id,
    name,
    source,
    status: 'pending',
    imageTag: null,
    liveUrl: null,
    createdAt: Date.now(),
    logs: [`[${formatTime()}] Deployment ${id} created`],
  }
}

export function getNextStatus(current: DeploymentStatus): DeploymentStatus | null {
  if (current === 'failed' || current === 'running') return null
  const index = STATUS_SEQUENCE.indexOf(current)
  if (index === -1 || index >= STATUS_SEQUENCE.length - 1) return null
  return STATUS_SEQUENCE[index + 1] ?? null
}

export function statusDurationMs(status: DeploymentStatus): number {
  switch (status) {
    case 'pending':
      return 2200
    case 'building':
      return 4800
    case 'deploying':
      return 3600
    default:
      return 0
  }
}

export function nextLogLine(status: DeploymentStatus, index: number): string | null {
  const pool =
    status === 'pending'
      ? PENDING_LOGS
      : status === 'building'
        ? BUILD_LOGS
        : status === 'deploying'
          ? DEPLOY_LOGS
          : []

  if (index >= pool.length) return null
  return `[${formatTime()}] ${pool[index]}`
}

export function statusTransitionLog(
  from: DeploymentStatus,
  to: DeploymentStatus,
): string {
  return `[${formatTime()}] Status: ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`
}

export function failureLog(): string {
  return `[${formatTime()}] ✗ Health check failed — rolling back`
}

export function formatTime(date = new Date()): string {
  return date.toLocaleTimeString('en-US', { hour12: false })
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export const INITIAL_DEPLOYMENTS: Deployment[] = [
  {
    id: 'a1b2c3d4',
    name: 'api-gateway',
    source: { type: 'git', url: 'https://github.com/jetpaas/api-gateway' },
    status: 'running',
    imageTag: 'jetpaas/app:a1b2c3d4',
    liveUrl: 'https://api-gateway-a1b2c3.jetpaas.dev',
    createdAt: Date.now() - 1000 * 60 * 47,
    logs: [
      `[${formatTime(new Date(Date.now() - 1000 * 60 * 45))}] Deployment a1b2c3d4 created`,
      `[${formatTime(new Date(Date.now() - 1000 * 60 * 44))}] Status: Pending → Building`,
      `[${formatTime(new Date(Date.now() - 1000 * 60 * 43))}] ✓ Build completed in 38s`,
      `[${formatTime(new Date(Date.now() - 1000 * 60 * 42))}] Status: Building → Deploying`,
      `[${formatTime(new Date(Date.now() - 1000 * 60 * 41))}] ✓ Deployment live`,
      `[${formatTime(new Date(Date.now() - 1000 * 60 * 40))}] Status: Deploying → Running`,
    ],
  },
]
