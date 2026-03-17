import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

const CANONICAL_AGENTS = [
  { id: 'chief', name: 'Chief Agent' },
  { id: 'content', name: 'Content Agent' },
  { id: 'growth', name: 'Growth Agent' },
  { id: 'coding', name: 'Coding Agent' },
  { id: 'product', name: 'Product Agent' },
  { id: 'finance', name: 'Finance Agent' },
] as const;

type CanonicalAgentId = (typeof CANONICAL_AGENTS)[number]['id'];
type AggregatedAgentStatus = 'running' | 'ok' | 'error' | 'idle';

type OpenClawCronJob = {
  id: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  agentId?: string;
  payload?: {
    message?: string;
    text?: string;
  };
  state?: {
    lastStatus?: string;
    lastRunStatus?: string;
    lastRunAtMs?: number;
    nextRunAtMs?: number;
    lastDurationMs?: number;
    consecutiveErrors?: number;
    lastError?: string;
  };
};

type OpenClawCronListResponse = {
  jobs?: OpenClawCronJob[];
};

function normalizeAgentId(value?: string | null): CanonicalAgentId | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized === 'main') return 'chief';

  if (CANONICAL_AGENTS.some((agent) => agent.id === normalized)) {
    return normalized as CanonicalAgentId;
  }

  return null;
}

function extractJsonPayload(raw: string): OpenClawCronListResponse {
  const jsonStart = raw.indexOf('{');
  if (jsonStart === -1) {
    throw new Error('OpenClaw CLI did not return JSON payload');
  }

  return JSON.parse(raw.slice(jsonStart)) as OpenClawCronListResponse;
}

function inferAgentId(job: OpenClawCronJob): CanonicalAgentId | null {
  const explicitAgentId = normalizeAgentId(job.agentId);
  if (explicitAgentId) return explicitAgentId;

  const searchText = [job.name, job.description, job.payload?.message, job.payload?.text]
    .filter((value): value is string => Boolean(value))
    .join('\n');

  const directMatch = searchText.match(/(?:归属Agent|目标Agent)[:：]\s*([a-z-]+)/i);
  if (directMatch) {
    const matchedAgentId = normalizeAgentId(directMatch[1]);
    if (matchedAgentId) return matchedAgentId;
  }

  const normalizedText = searchText.toLowerCase();
  const patternMap: Array<{ agentId: CanonicalAgentId; patterns: string[] }> = [
    { agentId: 'chief', patterns: ['chief agent', '目标agent：main', '归属agent：main', '目标agent：chief', '归属agent：chief'] },
    { agentId: 'content', patterns: ['content agent', '目标agent：content', '归属agent：content'] },
    { agentId: 'growth', patterns: ['growth agent', '目标agent：growth', '归属agent：growth'] },
    { agentId: 'coding', patterns: ['coding agent', '目标agent：coding', '归属agent：coding'] },
    { agentId: 'product', patterns: ['product agent', '目标agent：product', '归属agent：product'] },
    { agentId: 'finance', patterns: ['finance agent', '目标agent：finance', '归属agent：finance'] },
  ];

  for (const candidate of patternMap) {
    if (candidate.patterns.some((pattern) => normalizedText.includes(pattern))) {
      return candidate.agentId;
    }
  }

  return null;
}

function normalizeJobStatus(job: OpenClawCronJob): AggregatedAgentStatus {
  if (job.enabled === false) {
    return 'idle';
  }

  const normalizedStatus = (job.state?.lastStatus || job.state?.lastRunStatus || '').trim().toLowerCase();

  if (['running', 'busy', 'working', 'queued', 'started', 'in-progress'].includes(normalizedStatus)) {
    return 'running';
  }

  if (['error', 'failed', 'timeout', 'timed-out', 'cancelled'].includes(normalizedStatus)) {
    return 'error';
  }

  if (['ok', 'success', 'succeeded', 'completed', 'finished'].includes(normalizedStatus)) {
    return 'ok';
  }

  return 'idle';
}

async function loadOpenClawCronJobs(): Promise<OpenClawCronJob[]> {
  // 认证由服务端本机 OpenClaw CLI 处理；浏览器只访问本地 API，不暴露 Gateway token。
  const { stdout } = await execFileAsync('openclaw', ['cron', 'list', '--json', '--all'], {
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
  });

  const payload = extractJsonPayload(stdout);
  return payload.jobs || [];
}

export async function GET() {
  try {
    const jobs = await loadOpenClawCronJobs();

    const agents = CANONICAL_AGENTS.map((agent) => {
      const agentJobs = jobs.filter((job) => inferAgentId(job) === agent.id);
      const completedTasks = agentJobs.filter((job) => normalizeJobStatus(job) === 'ok').length;
      const failedTasks = agentJobs.filter((job) => normalizeJobStatus(job) === 'error').length;
      const runningTasks = agentJobs.filter((job) => normalizeJobStatus(job) === 'running').length;
      const idleTasks = Math.max(agentJobs.length - completedTasks - failedTasks - runningTasks, 0);
      const lastRunAtMs = agentJobs.reduce<number | null>((latest, job) => {
        const current = job.state?.lastRunAtMs;
        if (!current) return latest;
        if (!latest || current > latest) return current;
        return latest;
      }, null);

      let status: AggregatedAgentStatus = 'idle';
      if (runningTasks > 0) status = 'running';
      else if (failedTasks > 0) status = 'error';
      else if (completedTasks > 0) status = 'ok';

      return {
        id: agent.id,
        name: agent.name,
        status,
        tasks: agentJobs.length,
        completedTasks,
        failedTasks,
        runningTasks,
        idleTasks,
        lastRun: lastRunAtMs ? new Date(lastRunAtMs).toISOString() : null,
      };
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      source: 'openclaw-cron-realtime',
      agents,
      activeSessions: [],
    });
  } catch (error) {
    console.error('Error fetching real-time agent status from OpenClaw cron:', error);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      source: 'error',
      agents: CANONICAL_AGENTS.map((agent) => ({
        id: agent.id,
        name: agent.name,
        status: 'idle' as const,
        tasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        runningTasks: 0,
        idleTasks: 0,
        lastRun: null,
      })),
      activeSessions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
