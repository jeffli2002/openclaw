import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

function getCronTasks() {
  try {
    const output = execSync('openclaw cron list 2>&1', { 
      encoding: 'utf8',
      timeout: 10000 
    });
    
    const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('ID') && !line.startsWith('='));
    const tasks = [];
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 8) {
        const id = parts[0];
        const name = parts[1];
        const schedule = parts.slice(2, 5).join(' ');
        const next = parts[5];
        const last = parts[6];
        const status = parts[7];
        
        tasks.push({ id, name, schedule, next, last, status });
      }
    }
    return tasks;
  } catch (error) {
    console.error('Error fetching cron tasks:', error);
    return [];
  }
}

function getSessions() {
  try {
    const output = execSync('openclaw sessions 2>&1', { 
      encoding: 'utf8',
      timeout: 10000 
    });
    
    const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('Session') && !line.startsWith('='));
    const sessions = [];
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 6) {
        const kind = parts[0];
        const key = parts.slice(1, parts.findIndex(p => p.includes('ago'))).join(' ');
        const age = parts[parts.length - 4];
        const model = parts[parts.length - 3];
        
        sessions.push({ kind, key, age, model });
      }
    }
    return sessions;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

export async function GET() {
  const cronTasks = getCronTasks();
  const sessions = getSessions();
  
  // 按 Agent 分组 cron tasks
  const tasksByAgent = {
    coding: cronTasks.filter(t => t.name.includes('sync-github') || t.name.includes('supabase')),
    content: cronTasks.filter(t => t.name.includes('newsletter') || t.name.includes('content-publish')),
    growth: cronTasks.filter(t => t.name.includes('growth') || t.name.includes('seo')),
    product: cronTasks.filter(t => t.name.includes('product')),
    chief: cronTasks.filter(t => t.name.includes('daily-report') || t.name.includes('memory') || t.name.includes('health')),
  };
  
  // 计算每个 Agent 的状态
  const agentStatus = Object.entries(tasksByAgent).map(([agent, tasks]) => {
    const runningCount = tasks.filter(t => t.status === 'running').length;
    const errorCount = tasks.filter(t => t.status === 'error').length;
    const okCount = tasks.filter(t => t.status === 'ok').length;
    
    let status = 'idle';
    if (runningCount > 0) status = 'running';
    else if (errorCount > 0) status = 'error';
    else if (okCount > 0) status = 'ok';
    
    return {
      id: agent,
      name: agent.charAt(0).toUpperCase() + agent.slice(1) + ' Agent',
      status,
      tasks: tasks.length,
      completedTasks: okCount,
      failedTasks: errorCount,
      lastRun: tasks.length > 0 ? tasks[0].last : '—',
    };
  });
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    agents: agentStatus,
    cronTasks,
    sessions,
  });
}
