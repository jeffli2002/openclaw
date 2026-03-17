import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://njxjuvxosvwvluxefrzg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qeGp1dnhvc3Z3dmx1eGVmcnpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgyOTI1NSwiZXhwIjoyMDg3NDA1MjU1fQ.hNxgmLO2OOG75jmRKcFmddDq0fF21C0Uqh8XFFqydDU';

const CANONICAL_AGENTS = [
  { id: 'chief', name: 'Chief Agent' },
  { id: 'content', name: 'Content Agent' },
  { id: 'growth', name: 'Growth Agent' },
  { id: 'coding', name: 'Coding Agent' },
  { id: 'product', name: 'Product Agent' },
  { id: 'finance', name: 'Finance Agent' },
] as const;

type CanonicalAgentId = typeof CANONICAL_AGENTS[number]['id'];

interface Task {
  id: string;
  name: string;
  status: string;
  last_run: string;
}

interface AgentTasks {
  [key: string]: Task[];
}

async function fetchFromSupabase(table: string): Promise<any[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${table}:`, error);
    return [];
  }
}

function inferCollaborationFromTasks(tasks: Task[], agents: typeof CANONICAL_AGENTS): any[] {
  // 检测正在运行的任务
  const runningTasks = tasks.filter(t => t.status === 'running');
  
  if (runningTasks.length === 0) return [];

  // 统计每个 Agent 的任务数
  const agentTaskCount: Record<string, number> = {};
  for (const task of tasks) {
    const taskName = task.name.toLowerCase();
    for (const agent of agents) {
      if (taskName.includes(agent.id) || taskName.includes(agent.name.toLowerCase())) {
        agentTaskCount[agent.id] = (agentTaskCount[agent.id] || 0) + 1;
      }
    }
  }

  const activeAgents = Object.entries(agentTaskCount)
    .filter(([_, count]) => count > 0)
    .map(([id]) => id);

  if (activeAgents.length >= 3) {
    return [{
      id: 'collab-meeting-b',
      room: 'meeting-b',
      roomName: 'Meeting B',
      agentIds: activeAgents,
      label: `${activeAgents.length} 个 Agent 正在协作`,
      detectedFrom: 'cron-tasks',
      lastUpdatedAt: new Date().toISOString(),
    }];
  } else if (activeAgents.length === 2) {
    return [{
      id: 'collab-meeting-a',
      room: 'meeting-a',
      roomName: 'Meeting A',
      agentIds: activeAgents,
      label: `${activeAgents.length} 个 Agent 正在协作`,
      detectedFrom: 'cron-tasks',
      lastUpdatedAt: new Date().toISOString(),
    }];
  }

  return [];
}

export async function GET() {
  try {
    // 从 Supabase 读取任务数据
    const tasks = await fetchFromSupabase('tasks');
    
    // 构建 Agent 状态
    const agents = CANONICAL_AGENTS.map(agent => {
      const agentTasks = tasks.filter(t => 
        t.name.toLowerCase().includes(agent.id) ||
        t.name.toLowerCase().includes(agent.name.toLowerCase())
      );
      
      const running = agentTasks.filter(t => t.status === 'running').length;
      const error = agentTasks.filter(t => t.status === 'error').length;
      const ok = agentTasks.filter(t => t.status === 'ok').length;
      
      let status: string = 'idle';
      if (running > 0) status = 'running';
      else if (error > 0) status = 'error';
      else if (ok > 0) status = 'ok';

      return {
        id: agent.id,
        name: agent.name,
        status,
        tasks: agentTasks.length,
        completedTasks: ok,
        failedTasks: error,
        runningTasks: running,
        idleTasks: Math.max(0, agentTasks.length - running - error - ok),
        lastRun: agentTasks[0]?.last_run || null,
      };
    });

    // 检测协作关系
    const collaborations = inferCollaborationFromTasks(tasks, CANONICAL_AGENTS);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      source: 'supabase-5min-sync',
      agents,
      collaborations,
      activeSessions: [],
    });
  } catch (error) {
    console.error('Error in agent-status API:', error);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      source: 'error',
      agents: CANONICAL_AGENTS.map(a => ({ ...a, status: 'idle', tasks: 0 })),
      collaborations: [],
      activeSessions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
