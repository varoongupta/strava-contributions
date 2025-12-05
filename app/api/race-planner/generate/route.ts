import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getRunningActivities } from '@/lib/db';
import { analyzeRunningData, generateTrainingPlan, type RaceInputs } from '@/lib/race-planner';
import { subMonths } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;
    const body = await request.json();

    // Validate inputs
    const raceDistance = parseFloat(body.raceDistance); // in meters
    const raceDate = new Date(body.raceDate);
    const goalTime = body.goalTime ? parseFloat(body.goalTime) : undefined; // in seconds
    const goalPace = body.goalPace ? parseFloat(body.goalPace) : undefined; // in seconds per km

    if (!raceDistance || isNaN(raceDistance) || raceDistance <= 0) {
      return NextResponse.json(
        { error: 'Invalid race distance' },
        { status: 400 }
      );
    }

    if (isNaN(raceDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid race date' },
        { status: 400 }
      );
    }

    // Get running activities for analysis
    const oneYearAgo = subMonths(new Date(), 12);
    const runs = await getRunningActivities(userId, oneYearAgo, new Date());

    const runsWithDates = runs.map(run => ({
      date: new Date(run.date),
      duration: run.duration,
      distance: run.distance,
      metadata: run.metadata as Record<string, unknown> | undefined,
    }));

    // Analyze running data
    const analysis = analyzeRunningData(runsWithDates);

    // Build race inputs
    const raceInputs: RaceInputs = {
      raceDistance,
      raceDate,
      goalTime,
      goalPace,
      currentWeeklyMileage: body.currentWeeklyMileage ? parseFloat(body.currentWeeklyMileage) : undefined,
      injuryHistory: body.injuryHistory || undefined,
      trainingExperience: body.trainingExperience,
      availableDaysPerWeek: body.availableDaysPerWeek ? parseInt(body.availableDaysPerWeek) : undefined,
      preferredLongRunDay: body.preferredLongRunDay,
    };

    // Generate training plan with LLM (includes raw runs for context)
    const plan = await generateTrainingPlan(raceInputs, analysis, runsWithDates);

    return NextResponse.json({
      plan,
      analysis,
      inputs: raceInputs,
    });
  } catch (error: any) {
    console.error('Error generating training plan:', error);
    const errorMessage = error.message || 'Failed to generate training plan';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

