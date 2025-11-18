import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getActivities } from '@/lib/db';
import { deduplicateActivities } from '@/lib/deduplication';
import { subYears } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;
    const { searchParams } = new URL(request.url);
    
    // Default to last year of data
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : subYears(endDate, 1);

    // Fetch activities
    const activities = await getActivities(userId, startDate, endDate);

    // Convert date strings to Date objects
    const activitiesWithDates = activities.map((activity) => ({
      ...activity,
      date: new Date(activity.date),
      created_at: new Date(activity.created_at),
    }));

    // Deduplicate activities
    const { activities: deduplicated, duplicatesRemoved } = deduplicateActivities(
      activitiesWithDates
    );

    return NextResponse.json({
      activities: deduplicated,
      duplicatesRemoved,
      total: deduplicated.length,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

