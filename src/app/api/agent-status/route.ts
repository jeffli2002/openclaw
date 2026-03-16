import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = 'https://njxjuvxosvwvluxefrzg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qeGp1dnhvc3Z3dmx1eGVmcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjkyNTUsImV4cCI6MjA4NzQwNTI1NX0.FqfMyI3uSkiHVepWVccxFU4ie5RU00VVdrF-aOr9LjI';

const CANONICAL_AGENT_IDS = ['chief', 'content', 'growth', 'coding', 'product', 'finance'];

export async function GET() {
  try {
    // 从 Supabase 读取 agent 状态
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?id=like.agent%25`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const tasks = await response.json();
    
    // 转换为 agent 状态
    const agents = CANONICAL_AGENT_IDS.map(agentId => {
      const task = tasks.find((t: any) => t.id === `agent-${agentId}`);
      return {
        id: agentId,
        name: task?.name || `${agentId} Agent`,
        status: task?.status || 'idle',
        tasks: parseInt(task?.schedule) || 0,
        completedTasks: 0,
        failedTasks: task?.error_count || 0,
        runningTasks: 0,
        lastRun: task?.last_run || null,
      };
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      source: 'supabase',
      agents,
      activeSessions: [],
    });
  } catch (error) {
    console.error('Error fetching agent status:', error);
    
    // 返回降级状态
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      source: 'error',
      agents: CANONICAL_AGENT_IDS.map(agentId => ({
        id: agentId,
        name: `${agentId} Agent`,
        status: 'idle',
        tasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        runningTasks: 0,
        lastRun: null,
      })),
      activeSessions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
