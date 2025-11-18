import type { Activity } from '@/types/activity';
import { differenceInMinutes } from 'date-fns';

const DEDUPLICATION_WINDOW_MINUTES = 5;

export interface DeduplicationResult {
  activities: Activity[];
  duplicatesRemoved: number;
}

/**
 * Deduplicates activities from multiple sources.
 * If two activities of the same type occur within ±5 minutes,
 * prefer the Strava activity over Apple Health.
 */
export function deduplicateActivities(
  activities: Activity[]
): DeduplicationResult {
  // Sort by date (newest first)
  const sorted = [...activities].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  const kept: Activity[] = [];
  const seen = new Set<string>();
  let duplicatesRemoved = 0;

  for (const activity of sorted) {
    const key = `${activity.type}-${activity.date.toISOString()}`;
    
    // Check if we've already kept a similar activity
    let isDuplicate = false;
    
    for (const keptActivity of kept) {
      if (
        keptActivity.type === activity.type &&
        Math.abs(
          differenceInMinutes(activity.date, keptActivity.date)
        ) <= DEDUPLICATION_WINDOW_MINUTES
      ) {
        // Found a potential duplicate
        // Prefer Strava over Apple Health
        if (activity.source === 'strava' && keptActivity.source === 'apple_health') {
          // Replace Apple Health with Strava
          const index = kept.indexOf(keptActivity);
          kept[index] = activity;
          duplicatesRemoved++;
          isDuplicate = true;
          break;
        } else if (activity.source === 'apple_health' && keptActivity.source === 'strava') {
          // Skip this Apple Health activity, keep Strava
          isDuplicate = true;
          duplicatesRemoved++;
          break;
        } else if (activity.source === keptActivity.source) {
          // Same source, prefer the one we already have (first one encountered)
          isDuplicate = true;
          duplicatesRemoved++;
          break;
        }
      }
    }

    if (!isDuplicate && !seen.has(key)) {
      kept.push(activity);
      seen.add(key);
    }
  }

  // Sort by date descending
  kept.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    activities: kept,
    duplicatesRemoved,
  };
}

