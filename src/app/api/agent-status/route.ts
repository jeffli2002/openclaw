import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type CanonicalAgentId = 'chief' | 'content' | 'growth' | 'coding' | 'product' | 'finance';
type CronStatus = 'running' | 'ok' | 'error' | 'idle';

type RawCronJob = {
  id?: string;
  name?: string;
  enabled?: boolean;
  agentId?: string;
  state?: {
    lastStatus?: string;
    lastRunAtMs?: number;
    nextRunAtMs?: number;
    runningAtMs?: number;
  };
};

const CRON_STORE_PATH = '/root/.openclaw/cron/jobs.json';
const CANONICAL_AGENT_IDS: CanonicalAgentId[] = ['chief', 'content', 'growth', 'coding', 'product', 'finance'];
const AGENT_LABELS: Record<CanonicalAgentId, string> = {
  chief: 'Chief Agent',
  content: 'Content Agent',
  growth: 'Growth Agent',
  coding: 'Coding Agent',
  product: 'Product Agent',
  finance: 'Finance Agent',
};

const AGENT_ID_ALIAS: Record<string, CanonicalAgentId> = {
  chief: 'chief',
  main: 'chief',
  content: 'content',
  growth: 'growth',
  coding: 'coding',
  product: 'product',
  finance: 'finance',
};

const LEGACY_JOB_AGENT_MAP: Record<string, CanonicalAgentId> = {
  'cron-health-check': 'chief',
  'daily-memory-extractor': 'chief',
  'ai-daily-delivery-guard': 'chief',
  'daily-content-publish-guard': 'chief',
};

function parseJobsPayload(payload: string): RawCronJob[] {
  const parsed = JSON.parse(payload);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && Array.isArray(parsed.jobs)) {
    return parsed.jobs;
  }

  throw new Error('Unexpected cron JSON payload shape');
}

function readCronJobs() {
  try {
    const output = execFileSync('openclaw', ['cron', 'list', '--all', '--json'], {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return {
      jobs: parseJobsPayload(output),
      source: 'openclaw cron list --all --json',
    };
  } catch (error) {
    if (!existsSync(CRON_STORE_PATH)) {
      throw error;
    }

    const fileContent = readFileSync(CRON_STORE_PATH, 'utf8');
    return {
      jobs: parseJobsPayload(fileContent),
      source: 'fallback:/root/.openclaw/cron/jobs.json',
    };
  }
}

function getCronStatus(job: RawCronJob): CronStatus {
  if (job.state?.runningAtMs) {
    return 'running';
  }

  const lastStatus = job.state?.lastStatus;
  if (lastStatus === 'running' || lastStatus === 'ok' || lastStatus === 'error' || lastStatus === 'idle') {
    return lastStatus;
  }

  return 'idle';
}

function resolveAgentId(job: RawCronJob): CanonicalAgentId | null {
  const explicitAgentId = job.agentId ? AGENT_ID_ALIAS[job.agentId] : undefined;
  if (explicitAgentId) {
    return explicitAgentId;
  }

  const name = job.name || '';
  return LEGACY_JOB_AGENT_MAP[name] || null;
}

function toIsoOrNull(value?: number) {
  return value ? new Date(value).toISOString() : null;
}

export async function GET() {
  try {
    const { jobs, source } = readCronJobs();
    const enabledJobs = jobs.filter((job) => job.enabled !== false);

    const jobsByAgent = Object.fromEntries(
      CANONICAL_AGENT_IDS.map((agentId) => [agentId, [] as RawCronJob[]])
    ) as Record<CanonicalAgentId, RawCronJob[]>;

    const unassignedJobs: Array<{ id: string; name: string }> = [];

    for (const job of enabledJobs) {
      const agentId = resolveAgentId(job);
      if (!agentId) {
        unassignedJobs.push({
          id: job.id || 'unknown',
          name: job.name || 'unknown',
        });
        continue;
      }

      jobsByAgent[agentId].push(job);
    }

    const agents = CANONICAL_AGENT_IDS.map((agentId) => {
      const agentJobs = jobsByAgent[agentId];
      const statuses = agentJobs.map(getCronStatus);
      const runningTasks = statuses.filter((status) => status === 'running').length;
      const failedTasks = statuses.filter((status) => status === 'error').length;
      const completedTasks = statuses.filter((status) => status === 'ok').length;
      const idleTasks = statuses.filter((status) => status === 'idle').length;

      let status: CronStatus = 'idle';
      if (runningTasks > 0) status = 'running';
      else if (failedTasks > 0) status = 'error';
      else if (completedTasks > 0) status = 'ok';
      else if (idleTasks > 0) status = 'idle';

      const lastRunAtMs = agentJobs.reduce<number | null>((latest, job) => {
        const current = job.state?.lastRunAtMs;
        if (!current) return latest;
        if (!latest || current > latest) return current;
        return latest;
      }, null);

      return {
        id: agentId,
        name: AGENT_LABELS[agentId],
        status,
        tasks: agentJobs.length,
        completedTasks,
        failedTasks,
        runningTasks,
        idleTasks,
        lastRunAtMs,
        lastRun: toIsoOrNull(lastRunAtMs || undefined),
        jobs: agentJobs.map((job) => ({
          id: job.id || 'unknown',
          name: job.name || 'unknown',
          status: getCronStatus(job),
          lastRunAtMs: job.state?.lastRunAtMs || null,
          lastRun: toIsoOrNull(job.state?.lastRunAtMs),
          nextRunAtMs: job.state?.nextRunAtMs || null,
          nextRun: toIsoOrNull(job.state?.nextRunAtMs),
        })),
      };
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      source,
      totalEnabledJobs: enabledJobs.length,
      agents,
      unassignedJobs,
    });
  } catch (error) {
    console.error('Error fetching cron agent status:', error);

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        source: 'error',
        agents: CANONICAL_AGENT_IDS.map((agentId) => ({
          id: agentId,
          name: AGENT_LABELS[agentId],
          status: 'idle' as CronStatus,
          tasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          runningTasks: 0,
          idleTasks: 0,
          lastRunAtMs: null,
          lastRun: null,
          jobs: [],
        })),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
