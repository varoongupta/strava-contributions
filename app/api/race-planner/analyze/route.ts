import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getRunningActivities } from '@/lib/db';
import { analyzeRunningData } from '@/lib/race-planner';
import { subMonths } from 'date-fns';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;

    // Get running activities from the past year
    const oneYearAgo = subMonths(new Date(), 12);
    const runs = await getRunningActivities(userId, oneYearAgo, new Date());

    // Convert to format expected by analysis
    const runsWithDates = runs.map(run => ({
      date: new Date(run.date),
      duration: run.duration,
      distance: run.distance,
      metadata: run.metadata as Record<string, unknown> | undefined,
    }));

    // Analyze the data (this now includes recentBestEfforts)
    const analysis = analyzeRunningData(runsWithDates);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing running data:', error);
    return NextResponse.json(
      { error: 'Failed to analyze running data' },
      { status: 500 }
    );
  }
}

