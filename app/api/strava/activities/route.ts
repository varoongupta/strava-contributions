import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { fetchAllStravaActivities } from '@/lib/strava';
import { saveActivity } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;

    // Fetch all activities from Strava
    const stravaActivities = await fetchAllStravaActivities(userId);

    // Save activities to database
    let savedCount = 0;
    for (const activity of stravaActivities) {
      try {
        await saveActivity({
          userId,
          source: 'strava',
          type: activity.type,
          date: new Date(activity.start_date),
          duration: activity.elapsed_time,
          distance: activity.distance,
          metadata: {
            strava_id: activity.id,
            name: activity.name,
            moving_time: activity.moving_time,
          },
        });
        savedCount++;
      } catch (error) {
        console.error('Error saving activity:', error);
      }
    }

    return NextResponse.json({
      success: true,
      activitiesFetched: stravaActivities.length,
      activitiesSaved: savedCount,
    });
  } catch (error) {
    console.error('Error syncing Strava activities:', error);
    return NextResponse.json(
      { error: 'Failed to sync activities' },
      { status: 500 }
    );
  }
}

