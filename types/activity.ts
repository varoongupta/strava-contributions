export type ActivityType =
  | 'Run'
  | 'Ride'
  | 'Swim'
  | 'Workout'
  | 'Hike'
  | 'Walk'
  | 'VirtualRide'
  | 'VirtualRun'
  | 'EBikeRide'
  | 'Yoga'
  | 'WeightTraining'
  | 'Crossfit'
  | 'Other';

export type ActivitySource = 'strava' | 'apple_health';

export interface Activity {
  id: string;
  user_id: string;
  source: ActivitySource;
  type: ActivityType;
  date: Date;
  duration: number; // in seconds
  distance?: number; // in meters
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  elapsed_time: number;
  distance: number;
  moving_time: number;
}

export interface AppleHealthWorkout {
  type: string;
  startDate: string;
  duration: number;
  totalDistance?: number;
  workoutActivityType?: string;
}

