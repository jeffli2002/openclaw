import { NextResponse } from 'next/server';
import { syncSecondBrainData } from '@/lib/sync-supabase';

export async function GET() {
  try {
    const result = await syncSecondBrainData();
    return NextResponse.json({
      success: true,
      message: `Synced ${result.memories.length} memories, ${result.docs.length} documents, ${result.tasks.length} tasks`,
      time: result.time,
      tasks: result.tasks,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
