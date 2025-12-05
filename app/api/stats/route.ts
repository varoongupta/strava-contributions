import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getActivityStats } from '@/lib/db';
import { subDays } from 'date-fns';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;
    
    // Get stats for past 365 days
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const oneYearAgo = subDays(today, 365);
    oneYearAgo.setHours(0, 0, 0, 0);
    
    const yearStats = await getActivityStats(userId, oneYearAgo, today);
    
    // Get all-time stats
    const allTimeStats = await getActivityStats(userId);

    return NextResponse.json({
      year: {
        totalActivities: parseInt(yearStats.total_activities || '0'),
        totalDuration: parseFloat(yearStats.total_duration || '0'),
        totalDistance: parseFloat(yearStats.total_distance || '0'),
        activeDays: parseInt(yearStats.active_days || '0'),
        firstActivity: yearStats.first_activity,
        lastActivity: yearStats.last_activity,
      },
      allTime: {
        totalActivities: parseInt(allTimeStats.total_activities || '0'),
        totalDuration: parseFloat(allTimeStats.total_duration || '0'),
        totalDistance: parseFloat(allTimeStats.total_distance || '0'),
        activeDays: parseInt(allTimeStats.active_days || '0'),
        firstActivity: allTimeStats.first_activity,
        lastActivity: allTimeStats.last_activity,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

