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
type CollaborationRoom = 'meeting-a' | 'meeting-b';

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
  updatedAt?: number;
  ageMs?: number;
  sessionId?: string;
  systemSent?: boolean;
  abortedLastRun?: boolean;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  totalTokensFresh?: boolean;
  model?: string;
  modelProvider?: string;
  contextTokens?: number;
  agentId?: string;
  kind?: string;
};

type OpenClawSessionsResponse = {
  sessions?: OpenClawSession[];
};

type ApiSession = {
  key: string;
  agentId: CanonicalAgentId;
  updatedAt: number;
  ageMs: number;
  kind?: string;
  isSubagent: boolean;
};

type ApiCollaboration = {
  id: string;
  room: CollaborationRoom;
  roomName: string;
  agentIds: CanonicalAgentId[];
  label: string;
  detectedFrom: 'subagent-session';
  lastUpdatedAt: string;
  sessionKeys: string[];
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
  if (jsonStart === -1) {
    throw new Error('OpenClaw CLI did not return JSON payload');
  }

  return JSON.parse(raw.slice(jsonStart)) as T;
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
  const { stdout } = await execFileAsync('openclaw', ['cron', 'list', '--json', '--all'], {
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
  });

  const payload = extractJsonPayload<OpenClawCronListResponse>(stdout);
  return payload.jobs || [];
}

async function loadOpenClawSessions(): Promise<OpenClawSession[]> {
  const { stdout } = await execFileAsync('openclaw', ['sessions', '--all-agents', '--active', '20', '--json'], {
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
  });

  const payload = extractJsonPayload<OpenClawSessionsResponse>(stdout);
  return payload.sessions || [];
}

function normalizeActiveSessions(sessions: OpenClawSession[]): ApiSession[] {
  const now = Date.now();

  return sessions
    .map((session) => {
      const agentId = normalizeAgentId(session.agentId);
      if (!agentId) return null;

      const updatedAt = session.updatedAt || now;
      const ageMs = typeof session.ageMs === 'number' ? session.ageMs : Math.max(now - updatedAt, 0);

      return {
        key: session.key,
        agentId,
        updatedAt,
        ageMs,
        kind: session.kind,
        isSubagent: session.key.includes(':subagent:'),
      } satisfies ApiSession;
    })
    .filter((session): session is ApiSession => Boolean(session))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function buildCollaborations(activeSessions: ApiSession[]): ApiCollaboration[] {
  const subagentSessions = activeSessions.filter((session) => session.isSubagent && session.agentId !== 'chief');
  if (subagentSessions.length === 0) {
    return [];
  }

  const dedupedByAgent = new Map<CanonicalAgentId, ApiSession>();
  for (const session of subagentSessions) {
    const current = dedupedByAgent.get(session.agentId);
    if (!current || session.updatedAt > current.updatedAt) {
      dedupedByAgent.set(session.agentId, session);
    }
  }

  const participantSessions = Array.from(dedupedByAgent.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  const participantAgentIds = participantSessions.map((session) => session.agentId);
  const latestUpdatedAt = participantSessions.reduce((latest, session) => Math.max(latest, session.updatedAt), 0);

  if (participantAgentIds.length >= 2) {
    const room = 'meeting-b' as const;
    return [
      {
        id: `collab-${room}-${participantAgentIds.join('-')}-${latestUpdatedAt}`,
        room,
        roomName: 'Meeting B',
        agentIds: ['chief', ...participantAgentIds],
        label: `Chief 正在与 ${participantAgentIds.length} 个 Agent 多方沟通`,
        detectedFrom: 'subagent-session',
        lastUpdatedAt: new Date(latestUpdatedAt).toISOString(),
        sessionKeys: participantSessions.map((session) => session.key),
      },
    ];
  }

  const [participant] = participantSessions;
  return [
    {
      id: `collab-meeting-a-chief-${participant.agentId}-${participant.updatedAt}`,
      room: 'meeting-a',
      roomName: 'Meeting A',
      agentIds: ['chief', participant.agentId],
      label: `Chief 正在与 ${participant.agentId} 做双人沟通`,
      detectedFrom: 'subagent-session',
      lastUpdatedAt: new Date(participant.updatedAt).toISOString(),
      sessionKeys: [participant.key],
    },
  ];
}

export async function GET() {
  try {
    const [jobs, sessions] = await Promise.all([loadOpenClawCronJobs(), loadOpenClawSessions()]);
    const activeSessions = normalizeActiveSessions(sessions);
    const activeCollaborations = buildCollaborations(activeSessions);

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
      source: 'openclaw-cron-and-sessions',
      agents,
      activeSessions,
      activeCollaborations,
    });
  } catch (error) {
    console.error('Error fetching real-time agent status from OpenClaw:', error);

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
