import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import type { AppleHealthWorkout, ActivityType } from '@/types/activity';

const WALK_TYPES = ['HKWorkoutActivityTypeWalking', 'HKWorkoutActivityTypeHiking'];

export function isValidHealthActivityType(type: string): boolean {
  return !WALK_TYPES.includes(type);
}

function mapHealthActivityType(healthType: string): ActivityType | null {
  const typeMap: Record<string, ActivityType> = {
    HKWorkoutActivityTypeRunning: 'Run',
    HKWorkoutActivityTypeCycling: 'Ride',
    HKWorkoutActivityTypeSwimming: 'Swim',
    HKWorkoutActivityTypeTraditionalStrengthTraining: 'WeightTraining',
    HKWorkoutActivityTypeCrossTraining: 'Crossfit',
    HKWorkoutActivityTypeYoga: 'Yoga',
    HKWorkoutActivityTypeElliptical: 'Workout',
    HKWorkoutActivityTypeRowing: 'Workout',
    HKWorkoutActivityTypeFunctionalStrengthTraining: 'WeightTraining',
  };

  return typeMap[healthType] || 'Other';
}

export async function parseAppleHealthExport(
  file: File
): Promise<AppleHealthWorkout[]> {
  const zip = new JSZip();
  const zipData = await file.arrayBuffer();
  await zip.loadAsync(zipData);

  // Find export.xml in the zip
  const exportFile = zip.file('export.xml');
  if (!exportFile) {
    throw new Error('export.xml not found in the uploaded file');
  }

  const xmlContent = await exportFile.async('string');

  // Parse XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  const result = parser.parse(xmlContent);
  const healthData = result.HealthData;

  if (!healthData || !healthData.Workout) {
    return [];
  }

  const workouts = Array.isArray(healthData.Workout)
    ? healthData.Workout
    : [healthData.Workout];

  const parsedWorkouts: AppleHealthWorkout[] = workouts
    .map((workout: any) => {
      const workoutType = workout['@_workoutActivityType'];
      
      if (!isValidHealthActivityType(workoutType)) {
        return null;
      }

      const startDate = workout['@_startDate'];
      const duration = parseFloat(workout['@_duration'] || '0');
      const totalDistance = workout['@_totalDistance'] 
        ? parseFloat(workout['@_totalDistance']) 
        : undefined;

      return {
        type: workoutType,
        startDate,
        duration,
        totalDistance,
        workoutActivityType: workoutType,
      };
    })
    .filter((w: AppleHealthWorkout | null): w is AppleHealthWorkout => w !== null);

  return parsedWorkouts;
}

export function convertHealthWorkoutToActivity(
  workout: AppleHealthWorkout,
  userId: string
) {
  const activityType = mapHealthActivityType(workout.type);
  
  if (!activityType) {
    return null;
  }

  const startDate = new Date(workout.startDate);
  const duration = Math.round(workout.duration); // Convert to seconds
  const distance = workout.totalDistance 
    ? Math.round(workout.totalDistance * 1000) // Convert km to meters
    : undefined;

  return {
    userId,
    source: 'apple_health' as const,
    type: activityType,
    date: startDate,
    duration,
    distance,
    metadata: {
      originalType: workout.type,
    },
  };
}

