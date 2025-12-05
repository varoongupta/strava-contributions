import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { parseAppleHealthExport, convertHealthWorkoutToActivity } from '@/lib/healthParser';
import { saveActivity } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse Apple Health export
    const workouts = await parseAppleHealthExport(file);

    // Convert and save activities
    let savedCount = 0;
    for (const workout of workouts) {
      const activity = convertHealthWorkoutToActivity(workout, userId);
      
      if (activity) {
        try {
          await saveActivity(activity);
          savedCount++;
        } catch (error) {
          console.error('Error saving health activity:', error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      workoutsParsed: workouts.length,
      activitiesSaved: savedCount,
    });
  } catch (error: any) {
    console.error('Error processing Apple Health upload:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process health data' },
      { status: 500 }
    );
  }
}

