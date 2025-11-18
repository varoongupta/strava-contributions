import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getActivityStats } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;
    const stats = await getActivityStats(userId);

    return NextResponse.json({
      totalActivities: parseInt(stats.total_activities || '0'),
      totalDuration: parseInt(stats.total_duration || '0'),
      totalDistance: parseInt(stats.total_distance || '0'),
      activeDays: parseInt(stats.active_days || '0'),
      firstActivity: stats.first_activity,
      lastActivity: stats.last_activity,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

