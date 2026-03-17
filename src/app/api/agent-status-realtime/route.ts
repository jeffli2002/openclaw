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

const EXCLUDED_JOB_NAMES = new Set([
  'sync-agent-status',
]);

const USER_CHANNEL_SEGMENTS = new Set([
  'discord',
  'feishu',
  'googlechat',
  'imessage',
  'irc',
  'line',
  'signal',
  'slack',
  'telegram',
  'whatsapp',
]);

const ACTIVE_SESSION_WINDOW_MINUTES = 20;

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

type OpenClawSession = {
  key: string;
  agentId?: string;
  kind?: string;
  updatedAt?: number;
  ageMs?: number;
  sessionId?: string;
};

type OpenClawSessionsResponse = {
  sessions?: OpenClawSession[];
};

type LiveSessionSummary = {
  key: string;
  agentId: CanonicalAgentId;
  updatedAt?: number;
  ageMs?: number;
  isSubagent: boolean;
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

function extractJsonPayload<T>(raw: string): T {
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    throw new Error('OpenClaw CLI did not return JSON payload');
  }

  return JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as T;
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

function isCronSession(session: OpenClawSession) {
  return session.key.includes(':cron:');
}

function isUserFacingSession(session: OpenClawSession) {
  if (session.kind === 'group') return true;

  return session.key
    .split(':')
    .some((segment) => USER_CHANNEL_SEGMENTS.has(segment));
}

function isRootSelfSession(session: OpenClawSession) {
  const parts = session.key.split(':');
  return parts.length === 3 && parts[0] === 'agent' && parts[1] === parts[2];
}

function isLikelySubagentSession(session: OpenClawSession) {
  return session.key.includes('subagent') || session.key.includes(':worker:') || session.key.includes(':delegate:');
}

function toLiveSessionSummary(session: OpenClawSession): LiveSessionSummary | null {
  const agentId = normalizeAgentId(session.agentId);
  if (!agentId) return null;
  if (isCronSession(session)) return null;
  if (isUserFacingSession(session)) return null;
  if (isRootSelfSession(session)) return null;

  return {
    key: session.key,
    agentId,
    updatedAt: session.updatedAt,
    ageMs: session.ageMs,
    isSubagent: isLikelySubagentSession(session),
  };
}

function dedupeLiveSessionsByAgent(sessions: LiveSessionSummary[]) {
  const byAgent = new Map<CanonicalAgentId, LiveSessionSummary>();

  sessions
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .forEach((session) => {
      if (!byAgent.has(session.agentId)) {
        byAgent.set(session.agentId, session);
      }
    });

  return [...byAgent.values()];
}

function buildActiveCollaborations(activeSessions: LiveSessionSummary[]) {
  const uniqueAgentIds = [...new Set(activeSessions.map((session) => session.agentId))];
  if (uniqueAgentIds.length < 2) return [];

  const room = uniqueAgentIds.length >= 3 ? 'meeting-b' : 'meeting-a';
  const roomName = room === 'meeting-a' ? 'Office A · 小会议室' : 'Office B · 大会议室';
  const agentNames = uniqueAgentIds.map((agentId) => {
    const agent = CANONICAL_AGENTS.find((candidate) => candidate.id === agentId);
    return agent?.name.replace(/ Agent$/, '') || agentId;
  });
  const latestUpdatedAt = activeSessions.reduce((latest, session) => {
    const current = session.updatedAt || 0;
    return current > latest ? current : latest;
  }, 0);

  return [
    {
      id: `live-collab-${uniqueAgentIds.join('-')}`,
      room,
      roomName,
      agentIds: uniqueAgentIds,
      label: uniqueAgentIds.length >= 3
        ? `${agentNames.join(' / ')} 正在多人协作`
        : `${agentNames.join(' / ')} 正在协作`,
      lastUpdatedAt: new Date(latestUpdatedAt || Date.now()).toISOString(),
      sessionKeys: activeSessions.map((session) => session.key),
      detectedFrom: 'openclaw-sessions-realtime',
    },
  ];
}

async function loadOpenClawCronJobs(): Promise<OpenClawCronJob[]> {
  const { stdout } = await execFileAsync('openclaw', ['cron', 'list', '--json', '--all'], {
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
  });

  const payload = extractJsonPayload<OpenClawCronListResponse>(stdout);
  return (payload.jobs || []).filter((job) => !EXCLUDED_JOB_NAMES.has(job.name || ''));
}

async function loadOpenClawActiveSessions(): Promise<LiveSessionSummary[]> {
  const { stdout } = await execFileAsync(
    'openclaw',
    ['sessions', '--json', '--all-agents', '--active', String(ACTIVE_SESSION_WINDOW_MINUTES)],
    {
      timeout: 30_000,
      maxBuffer: 8 * 1024 * 1024,
      env: process.env,
    }
  );

  const payload = extractJsonPayload<OpenClawSessionsResponse>(stdout);
  const liveSessions = (payload.sessions || [])
    .map((session) => toLiveSessionSummary(session))
    .filter((session): session is LiveSessionSummary => Boolean(session));

  return dedupeLiveSessionsByAgent(liveSessions);
}

export async function GET() {
  try {
    const [jobs, activeSessions] = await Promise.all([
      loadOpenClawCronJobs(),
      loadOpenClawActiveSessions(),
    ]);
    const activeCollaborations = buildActiveCollaborations(activeSessions);

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
      source: 'openclaw-cron+sessions-realtime',
      agents,
      activeSessions,
      activeCollaborations,
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
      activeCollaborations: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
