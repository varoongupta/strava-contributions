// Race training plan generation logic

export interface RunningAnalysis {
  averagePace: number; // seconds per km
  bestPace: number; // seconds per km (best recent performance)
  recentAveragePace: number; // last 3 months
  totalRuns: number;
  weeklyVolume: number; // km per week
  longestRun: number; // km
  suggestedGoalPace: number; // seconds per km
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  recentBestEfforts: Array<{ distance: number; pace: number; date: Date }>;
  fitnessTrend: 'improving' | 'stable' | 'declining';
}

export interface RaceInputs {
  raceDistance: number; // in meters
  goalTime?: number; // in seconds
  goalPace?: number; // in seconds per km
  raceDate: Date;
  currentWeeklyMileage?: number; // km per week
  injuryHistory?: string;
  trainingExperience?: 'beginner' | 'intermediate' | 'advanced';
  availableDaysPerWeek?: number;
  preferredLongRunDay?: string;
}

export interface TrainingWeek {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  totalDistance: number; // km
  phase: 'base' | 'build' | 'sharpening' | 'taper';
  workouts: TrainingWorkout[];
}

export interface TrainingWorkout {
  day: string;
  date: Date;
  type: 'easy' | 'tempo' | 'interval' | 'long' | 'recovery' | 'race' | 'strides' | 'race-pace';
  distance?: number; // km
  duration?: number; // minutes
  pace?: string; // min/km
  description: string;
  notes?: string;
}

// Riegel formula: T2 = T1 * (D2/D1)^1.06
function riegelFormula(time1: number, distance1: number, distance2: number): number {
  return time1 * Math.pow(distance2 / distance1, 1.06);
}

// Estimate goal pace using multiple methods
function estimateGoalPace(
  raceDistance: number,
  analysis: RunningAnalysis
): number {
  const raceDistanceKm = raceDistance / 1000;
  
  // Use Riegel formula to extrapolate from best efforts
  const bestEfforts = analysis.recentBestEfforts.sort((a, b) => a.pace - b.pace);
  if (bestEfforts.length > 0) {
    // Find best effort closest to race distance
    const closestEffort = bestEfforts.reduce((closest, current) => {
      const closestDiff = Math.abs(closest.distance - raceDistanceKm);
      const currentDiff = Math.abs(current.distance - raceDistanceKm);
      return currentDiff < closestDiff ? current : closest;
    });

    // If we have an effort at similar distance (within 20%), use it directly
    if (Math.abs(closestEffort.distance - raceDistanceKm) / raceDistanceKm < 0.2) {
      // Account for improvement potential (2-5% faster)
      return closestEffort.pace * 0.97;
    }

    // Otherwise, use Riegel formula to extrapolate
    const estimatedTime = riegelFormula(
      closestEffort.pace * closestEffort.distance,
      closestEffort.distance,
      raceDistanceKm
    );
    const estimatedPace = estimatedTime / raceDistanceKm;
    // Account for improvement (3-5%)
    return estimatedPace * 0.96;
  }

  // Fallback: use best recent pace with adjustment
  return analysis.bestPace * 0.95;
}

// Analyze running data to suggest goal pace
export function analyzeRunningData(runs: Array<{
  date: Date;
  duration: number; // seconds
  distance: number; // meters
  metadata?: Record<string, unknown>;
}>): RunningAnalysis {
  if (runs.length === 0) {
    return {
      averagePace: 0,
      bestPace: 0,
      recentAveragePace: 0,
      totalRuns: 0,
      weeklyVolume: 0,
      longestRun: 0,
      suggestedGoalPace: 0,
      confidence: 'low',
      reasoning: 'No running data available',
      recentBestEfforts: [],
      fitnessTrend: 'stable',
    };
  }

  // Calculate paces (seconds per km)
  const paces = runs
    .filter(run => run.distance > 0 && run.duration > 0)
    .map(run => ({
      pace: (run.duration / run.distance) * 1000,
      distance: run.distance / 1000,
      date: run.date,
    }));

  const averagePace = paces.reduce((a, b) => a + b.pace, 0) / paces.length;
  const bestPace = Math.min(...paces.map(p => p.pace));

  // Recent runs (last 3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recentRuns = runs.filter(run => new Date(run.date) >= threeMonthsAgo);
  const recentPaces = recentRuns
    .filter(run => run.distance > 0 && run.duration > 0)
    .map(run => ({
      pace: (run.duration / run.distance) * 1000,
      distance: run.distance / 1000,
      date: run.date,
    }));
  const recentAveragePace = recentPaces.length > 0
    ? recentPaces.reduce((a, b) => a + b.pace, 0) / recentPaces.length
    : averagePace;

  // Calculate weekly volume (last 8 weeks)
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const recentRunsForVolume = runs.filter(run => new Date(run.date) >= eightWeeksAgo);
  const totalDistance = recentRunsForVolume.reduce((sum, run) => sum + run.distance / 1000, 0);
  const weeklyVolume = totalDistance / 8;

  const longestRun = Math.max(...runs.map(run => run.distance / 1000));

  // Find best efforts at different distances
  const bestEffortsByDistance = new Map<number, { pace: number; date: Date }>();
  recentPaces.forEach(run => {
    const distanceKey = Math.round(run.distance);
    const existing = bestEffortsByDistance.get(distanceKey);
    if (!existing || run.pace < existing.pace) {
      bestEffortsByDistance.set(distanceKey, { pace: run.pace, date: run.date });
    }
  });
  const recentBestEfforts = Array.from(bestEffortsByDistance.entries())
    .map(([distance, data]) => ({ distance, ...data }));

  // Determine fitness trend
  const firstHalf = recentPaces.slice(0, Math.floor(recentPaces.length / 2));
  const secondHalf = recentPaces.slice(Math.floor(recentPaces.length / 2));
  const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b.pace, 0) / firstHalf.length : 0;
  const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b.pace, 0) / secondHalf.length : 0;
  let fitnessTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (secondHalfAvg > 0 && firstHalfAvg > 0) {
    const improvement = (firstHalfAvg - secondHalfAvg) / firstHalfAvg;
    if (improvement > 0.03) fitnessTrend = 'improving';
    else if (improvement < -0.03) fitnessTrend = 'declining';
  }

  // Suggest goal pace (will be refined based on race distance)
  const suggestedGoalPace = bestPace * 0.96;

  // Determine confidence level
  let confidence: 'low' | 'medium' | 'high' = 'low';
  let reasoning = '';
  
  if (runs.length < 5) {
    reasoning = 'Limited running history. Goal pace is an estimate based on available data.';
  } else if (runs.length < 20) {
    confidence = 'medium';
    reasoning = 'Moderate running history. Goal pace is based on your best recent performances with room for improvement.';
  } else {
    confidence = 'high';
    reasoning = 'Strong running history. Goal pace is based on your performance trends and accounts for potential improvement.';
  }

  return {
    averagePace,
    bestPace,
    recentAveragePace,
    totalRuns: runs.length,
    weeklyVolume,
    longestRun,
    suggestedGoalPace,
    confidence,
    reasoning,
    recentBestEfforts,
    fitnessTrend,
  };
}

// Calculate target peak mileage based on race distance
function getTargetPeakMileage(raceDistanceKm: number, experience: string): number {
  if (raceDistanceKm <= 5) {
    // 5K
    return experience === 'beginner' ? 30 : experience === 'intermediate' ? 40 : 50;
  } else if (raceDistanceKm <= 10) {
    // 10K
    return experience === 'beginner' ? 35 : experience === 'intermediate' ? 45 : 55;
  } else if (raceDistanceKm <= 21.1) {
    // Half Marathon
    return experience === 'beginner' ? 40 : experience === 'intermediate' ? 50 : 60;
  } else {
    // Marathon
    return experience === 'beginner' ? 50 : experience === 'intermediate' ? 70 : 90;
  }
}

// Calculate optimal training duration
function getTrainingDuration(raceDistanceKm: number, experience: string): number {
  if (raceDistanceKm <= 5) {
    return experience === 'beginner' ? 8 : 10;
  } else if (raceDistanceKm <= 10) {
    return experience === 'beginner' ? 10 : 12;
  } else if (raceDistanceKm <= 21.1) {
    return experience === 'beginner' ? 12 : 16;
  } else {
    return experience === 'beginner' ? 16 : 18;
  }
}

// Generate training plan based on inputs using LLM
export async function generateTrainingPlan(
  inputs: RaceInputs,
  analysis: RunningAnalysis,
  rawRuns?: Array<{
    date: Date;
    distance: number; // meters
    duration: number; // seconds
  }>
): Promise<TrainingWeek[]> {
  // If LLM is not configured, fall back to rule-based (for development/testing)
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set, using rule-based generation');
    return generateTrainingPlanRuleBased(inputs, analysis);
  }

  // Calculate all rule-based metrics for context
  const raceDistanceKm = inputs.raceDistance / 1000;
  const experience = inputs.trainingExperience || 'intermediate';
  const raceDate = new Date(inputs.raceDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysUntilRace = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const optimalWeeks = getTrainingDuration(raceDistanceKm, experience);
  const trainingWeeks = Math.min(optimalWeeks, Math.floor(daysUntilRace / 7));
  
  if (trainingWeeks < 8) {
    throw new Error('Not enough time before race. Need at least 8 weeks.');
  }

  const estimatedGoalPace = inputs.goalPace || (inputs.goalTime 
    ? (inputs.goalTime / raceDistanceKm)
    : estimateGoalPace(inputs.raceDistance, analysis));
  const goalPace = estimatedGoalPace;

  const targetPeakMileage = getTargetPeakMileage(raceDistanceKm, experience);
  const currentMileage = inputs.currentWeeklyMileage || analysis.weeklyVolume || 20;
  const startMileage = Math.max(currentMileage * 0.8, 15);

  const daysPerWeek = Math.min(
    inputs.availableDaysPerWeek || (experience === 'beginner' ? 4 : 5),
    6
  );

  const baseWeeks = Math.floor(trainingWeeks * 0.35);
  const buildWeeks = Math.floor(trainingWeeks * 0.35);
  const sharpeningWeeks = Math.floor(trainingWeeks * 0.20);
  const taperWeeks = trainingWeeks - baseWeeks - buildWeeks - sharpeningWeeks;

  const easyPace = goalPace + 75;
  const longPace = goalPace + 75;
  const tempoPace = goalPace - 15;
  const intervalPace = goalPace - 35;
  const racePace = goalPace;

  const maxLongRun = raceDistanceKm <= 5 ? 8 :
                     raceDistanceKm <= 10 ? 12 :
                     raceDistanceKm <= 21.1 ? raceDistanceKm * 0.9 : 32;

  // Prepare raw runs data for context
  const runsForContext = rawRuns || [];
  const runsWithPace = runsForContext.map(run => ({
    date: run.date,
    distance: run.distance,
    duration: run.duration,
    pace: (run.duration / run.distance) * 1000, // seconds per km
  }));

  // Build prompt context
  const promptContext = {
    inputs,
    analysis,
    rawRuns: runsWithPace,
    calculatedMetrics: {
      goalPace,
      targetPeakMileage,
      trainingWeeks,
      baseWeeks,
      buildWeeks,
      sharpeningWeeks,
      taperWeeks,
      startMileage,
      easyPace,
      longPace,
      tempoPace,
      intervalPace,
      racePace,
      maxLongRun,
      daysPerWeek,
    },
  };

  // Generate plan using LLM with fallback to rule-based
  try {
    const { generatePlanWithLLM } = await import('./llm-plan-generator');
    return await generatePlanWithLLM(promptContext);
  } catch (error: any) {
    console.error('LLM generation failed, falling back to rule-based:', error.message);
    // Fallback to rule-based generation
    return generateTrainingPlanRuleBased(inputs, analysis);
  }
}

// Rule-based fallback (original implementation)
function generateTrainingPlanRuleBased(
  inputs: RaceInputs,
  analysis: RunningAnalysis
): TrainingWeek[] {
  const weeks: TrainingWeek[] = [];
  const raceDate = new Date(inputs.raceDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const raceDistanceKm = inputs.raceDistance / 1000;
  const experience = inputs.trainingExperience || 'intermediate';

  // Calculate training duration
  const daysUntilRace = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const optimalWeeks = getTrainingDuration(raceDistanceKm, experience);
  const trainingWeeks = Math.min(optimalWeeks, Math.floor(daysUntilRace / 7));
  
  if (trainingWeeks < 8) {
    throw new Error('Not enough time before race. Need at least 8 weeks.');
  }

  // Estimate goal pace
  const estimatedGoalPace = inputs.goalPace || (inputs.goalTime 
    ? (inputs.goalTime / raceDistanceKm)
    : estimateGoalPace(inputs.raceDistance, analysis));
  const goalPace = estimatedGoalPace;

  // Calculate target peak mileage
  const targetPeakMileage = getTargetPeakMileage(raceDistanceKm, experience);
  const currentMileage = inputs.currentWeeklyMileage || analysis.weeklyVolume || 20;
  const startMileage = Math.max(currentMileage * 0.8, 15); // Start at 80% of current or 15km minimum

  // Determine number of run days
  const daysPerWeek = Math.min(
    inputs.availableDaysPerWeek || (experience === 'beginner' ? 4 : 5),
    6 // Max 6 days, always allow 1 rest day
  );

  // Phase breakdown
  const baseWeeks = Math.floor(trainingWeeks * 0.35);
  const buildWeeks = Math.floor(trainingWeeks * 0.35);
  const sharpeningWeeks = Math.floor(trainingWeeks * 0.20);
  const taperWeeks = trainingWeeks - baseWeeks - buildWeeks - sharpeningWeeks;

  // Pacing zones (in seconds per km)
  const easyPace = goalPace + 75; // ~60-90 sec/km slower
  const longPace = goalPace + 75; // Same as easy
  const tempoPace = goalPace - 15; // ~10-20 sec/km faster
  const intervalPace = goalPace - 35; // ~30-45 sec/km faster
  const racePace = goalPace;

  // Long run progression
  const maxLongRun = raceDistanceKm <= 5 ? 8 :
                     raceDistanceKm <= 10 ? 12 :
                     raceDistanceKm <= 21.1 ? raceDistanceKm * 0.9 : 32;

  let previousWeekMileage = startMileage;
  let previousLongRun = Math.min(startMileage * 0.25, 5);

  for (let weekNum = 1; weekNum <= trainingWeeks; weekNum++) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Determine phase
    let phase: 'base' | 'build' | 'sharpening' | 'taper';
    if (weekNum <= baseWeeks) {
      phase = 'base';
    } else if (weekNum <= baseWeeks + buildWeeks) {
      phase = 'build';
    } else if (weekNum <= baseWeeks + buildWeeks + sharpeningWeeks) {
      phase = 'sharpening';
    } else {
      phase = 'taper';
    }

    // Calculate weekly mileage with 10% rule and recovery weeks
    let weekMileage: number;
    const isRecoveryWeek = weekNum % 4 === 0 && phase !== 'taper'; // Every 4th week
    
    if (phase === 'taper') {
      const taperWeekNum = weekNum - (baseWeeks + buildWeeks + sharpeningWeeks);
      const peakMileage = previousWeekMileage;
      if (taperWeekNum === 1) {
        weekMileage = peakMileage * 0.6; // 40% reduction
      } else if (taperWeekNum === 2) {
        weekMileage = peakMileage * 0.4; // 60% reduction
      } else {
        weekMileage = peakMileage * 0.2; // 80% reduction
      }
    } else if (isRecoveryWeek) {
      weekMileage = previousWeekMileage * 0.75; // 25% reduction
    } else {
      const progress = (weekNum - 1) / (baseWeeks + buildWeeks + sharpeningWeeks - 1);
      const targetMileage = startMileage + (targetPeakMileage - startMileage) * progress;
      const maxIncrease = previousWeekMileage * 1.10; // 10% rule
      weekMileage = Math.min(targetMileage, maxIncrease, targetPeakMileage);
    }

    // Long run distance with 10% rule
    let longRunDistance: number;
    if (phase === 'taper') {
      const taperWeekNum = weekNum - (baseWeeks + buildWeeks + sharpeningWeeks);
      longRunDistance = taperWeekNum === 1 ? previousLongRun * 0.5 :
                       taperWeekNum === 2 ? previousLongRun * 0.3 : 3;
    } else {
      const progress = (weekNum - 1) / (baseWeeks + buildWeeks + sharpeningWeeks - 1);
      const targetLongRun = Math.min(
        startMileage * 0.25 + (maxLongRun - startMileage * 0.25) * progress,
        maxLongRun
      );
      const maxIncrease = previousLongRun * 1.10; // 10% rule
      longRunDistance = Math.min(targetLongRun, maxIncrease, maxLongRun);
    }

    // Adjust for recovery weeks
    if (isRecoveryWeek && phase !== 'taper') {
      longRunDistance *= 0.8;
    }

    previousWeekMileage = weekMileage;
    previousLongRun = longRunDistance;

    const workouts: TrainingWorkout[] = [];

    // Long run day
    const longRunDay = inputs.preferredLongRunDay === 'saturday' ? 6 : 0;
    const longRunDate = new Date(weekStart);
    longRunDate.setDate(longRunDate.getDate() + longRunDay);

    // Long run workout
    if (phase === 'sharpening' && weekNum % 2 === 0 && !isRecoveryWeek) {
      // Fast-finish long run (last 20-25% at goal pace)
      workouts.push({
        day: longRunDay === 0 ? 'Sunday' : 'Saturday',
        date: longRunDate,
        type: 'long',
        distance: Math.round(longRunDistance * 10) / 10,
        pace: `${formatPace(longPace)} → ${formatPace(racePace)}`,
        description: `Long run with fast finish. Run first ${Math.round(longRunDistance * 0.75)}km easy, last ${Math.round(longRunDistance * 0.25)}km at goal pace.`,
        notes: 'Practice race day pacing. Finish strong but controlled.',
      });
    } else {
      workouts.push({
        day: longRunDay === 0 ? 'Sunday' : 'Saturday',
        date: longRunDate,
        type: 'long',
        distance: Math.round(longRunDistance * 10) / 10,
        pace: formatPace(longPace),
        description: `Long run at easy pace. Build aerobic endurance.`,
        notes: 'Conversation pace. Focus on time on feet, not speed.',
      });
    }

    // Hard workout days (max 2 per week, never consecutive)
    let hardWorkoutCount = 0;
    const hardWorkoutDays: number[] = [];

    if (phase === 'base') {
      // Strides on one day
      if (daysPerWeek >= 4) {
        const stridesDay = longRunDay === 0 ? 3 : 2; // Tuesday or Wednesday
        hardWorkoutDays.push(stridesDay);
        const stridesDate = new Date(weekStart);
        stridesDate.setDate(stridesDate.getDate() + stridesDay);
        workouts.push({
          day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][stridesDay],
          date: stridesDate,
          type: 'strides',
          distance: 5, // 5km easy + strides
          pace: formatPace(easyPace),
          description: `Easy run with 4-6x 100m strides.`,
          notes: 'Strides should feel fast but controlled. Full recovery between.',
        });
        hardWorkoutCount = 1;
      }
    } else if (phase === 'build') {
      // Tempo run
      const tempoDay = longRunDay === 0 ? 2 : 2; // Wednesday
      hardWorkoutDays.push(tempoDay);
      const tempoDate = new Date(weekStart);
      tempoDate.setDate(tempoDate.getDate() + tempoDay);
      
      const tempoDuration = Math.min(15 + (weekNum - baseWeeks) * 2, 30); // Progress from 15 to 30 min
      workouts.push({
        day: 'Wednesday',
        date: tempoDate,
        type: 'tempo',
        duration: tempoDuration,
        pace: formatPace(tempoPace),
        description: `Tempo run: ${tempoDuration} minutes at threshold pace.`,
        notes: 'Comfortably hard effort. Should feel challenging but sustainable.',
      });
      hardWorkoutCount = 1;
    } else if (phase === 'sharpening') {
      // Intervals or race-pace segments
      if (weekNum % 2 === 1) {
        // Intervals
        const intervalDay = longRunDay === 0 ? 2 : 2;
        hardWorkoutDays.push(intervalDay);
        const intervalDate = new Date(weekStart);
        intervalDate.setDate(intervalDate.getDate() + intervalDay);
        
        let intervalDescription = '';
        if (raceDistanceKm <= 5) {
          intervalDescription = '6x 800m at 5K pace with 2min recovery jog';
        } else if (raceDistanceKm <= 10) {
          intervalDescription = '5x 1km at 10K pace with 2min recovery jog';
        } else {
          intervalDescription = '4x 1.6km at half marathon pace with 3min recovery jog';
        }
        
        workouts.push({
          day: 'Wednesday',
          date: intervalDate,
          type: 'interval',
          distance: 8, // Total workout distance
          pace: formatPace(intervalPace),
          description: `Interval workout: ${intervalDescription}.`,
          notes: 'Focus on form and pace control. Full recovery between intervals.',
        });
        hardWorkoutCount = 1;
      } else {
        // Race-pace segments
        const racePaceDay = longRunDay === 0 ? 2 : 2;
        hardWorkoutDays.push(racePaceDay);
        const racePaceDate = new Date(weekStart);
        racePaceDate.setDate(racePaceDate.getDate() + racePaceDay);
        
        let racePaceDescription = '';
        if (raceDistanceKm <= 5) {
          racePaceDescription = '2km easy warmup, 3x 1km at goal pace with 2min recovery, 1km cooldown';
        } else if (raceDistanceKm <= 10) {
          racePaceDescription = '2km easy warmup, 2x 2km at goal pace with 3min recovery, 1km cooldown';
        } else {
          racePaceDescription = '3km easy warmup, 2x 3km at goal pace with 4min recovery, 2km cooldown';
        }
        
        workouts.push({
          day: 'Wednesday',
          date: racePaceDate,
          type: 'race-pace',
          distance: 8,
          pace: formatPace(racePace),
          description: `Race pace workout: ${racePaceDescription}.`,
          notes: 'Practice goal pace. Should feel comfortable and controlled.',
        });
        hardWorkoutCount = 1;
      }
    }

    // Fill remaining days with easy runs
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const usedDays = new Set([longRunDay, ...hardWorkoutDays]);
    const easyRunDistance = (weekMileage - workouts.reduce((sum, w) => sum + (w.distance || 0), 0)) / (daysPerWeek - workouts.length);

    for (let day = 0; day < 7 && workouts.length < daysPerWeek; day++) {
      if (usedDays.has(day)) continue;
      
      const easyRunDate = new Date(weekStart);
      easyRunDate.setDate(easyRunDate.getDate() + day);
      
      // Recovery run after hard days
      const isRecoveryDay = day === longRunDay + 1 || hardWorkoutDays.includes(day - 1);
      
      workouts.push({
        day: dayNames[day],
        date: easyRunDate,
        type: isRecoveryDay ? 'recovery' : 'easy',
        distance: Math.round(easyRunDistance * 10) / 10,
        pace: formatPace(easyPace),
        description: isRecoveryDay ? 'Recovery run. Very easy pace.' : 'Easy aerobic run.',
        notes: isRecoveryDay 
          ? 'Focus on recovery. Very slow and relaxed.'
          : 'Conversation pace. Should feel comfortable.',
      });
    }

    // Add race day in final week
    if (weekNum === trainingWeeks) {
      workouts.push({
        day: dayNames[raceDate.getDay()],
        date: raceDate,
        type: 'race',
        distance: raceDistanceKm,
        pace: formatPace(racePace),
        description: `RACE DAY!`,
        notes: 'Trust your training. Start conservatively, finish strong. Stick to your goal pace.',
      });
    }

    // Sort workouts by date
    workouts.sort((a, b) => a.date.getTime() - b.date.getTime());

    weeks.push({
      weekNumber: weekNum,
      startDate: weekStart,
      endDate: weekEnd,
      totalDistance: Math.round(weekMileage * 10) / 10,
      phase,
      workouts,
    });
  }

  return weeks;
}

function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}
