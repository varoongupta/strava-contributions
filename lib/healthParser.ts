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
  // Check if it's an XML file or ZIP file
  const isZip = file.name.endsWith('.zip') || file.type === 'application/zip';
  const isXml = file.name.endsWith('.xml') || file.type === 'application/xml' || file.type === 'text/xml';

  let xmlContent: string;

  if (isXml) {
    // Direct XML file upload
    xmlContent = await file.text();
  } else if (isZip) {
    // ZIP file - search for export.xml recursively
    const zip = new JSZip();
    const zipData = await file.arrayBuffer();
    await zip.loadAsync(zipData);

    // Search for export.xml in the zip (could be at root or nested)
    let exportFile = zip.file('export.xml');
    
    // If not found at root, search recursively
    if (!exportFile) {
      // Get all files in the zip
      const allFiles = Object.keys(zip.files);
      
      // Look for export.xml in any path
      const exportPath = allFiles.find(path => 
        path.endsWith('export.xml') && !path.includes('__MACOSX')
      );
      
      if (exportPath) {
        exportFile = zip.file(exportPath);
      }
    }

    if (!exportFile) {
      // Log available files for debugging
      const allFiles = Object.keys(zip.files);
      console.error('Available files in zip:', allFiles);
      throw new Error('export.xml not found in the uploaded ZIP file. Please ensure the ZIP contains export.xml');
    }

    xmlContent = await exportFile.async('string');
  } else {
    throw new Error('Unsupported file type. Please upload a ZIP file or XML file.');
  }

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

// Format Apple Health type name for display
export function formatHealthTypeName(healthType: string): string {
  // Remove HKWorkoutActivityType prefix
  let name = healthType.replace(/^HKWorkoutActivityType/, '');
  
  // Convert camelCase to Title Case
  name = name.replace(/([A-Z])/g, ' $1').trim();
  
  // Handle common abbreviations
  name = name.replace(/\bHIIT\b/gi, 'HIIT');
  name = name.replace(/\bPilates\b/gi, 'Pilates');
  
  return name || healthType;
}

