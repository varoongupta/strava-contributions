import { getStravaToken, saveStravaToken } from './db';
import type { ActivityType, StravaActivity } from '@/types/activity';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export async function refreshStravaToken(
  userId: string,
  refreshToken: string
): Promise<StravaTokenResponse> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Strava token');
  }

  const data = await response.json();
  const expiresAt = new Date(data.expires_at * 1000);

  await saveStravaToken(
    userId,
    data.access_token,
    data.refresh_token,
    expiresAt
  );

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const token = await getStravaToken(userId);

  if (!token) {
    throw new Error('No Strava token found for user');
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(token.expires_at);
  const now = new Date();
  const buffer = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - now.getTime() < buffer) {
    const refreshed = await refreshStravaToken(userId, token.refresh_token);
    return refreshed.access_token;
  }

  return token.access_token;
}

const WALK_TYPES = ['Walk', 'Hike'];

export function isValidActivityType(type: string): type is ActivityType {
  return !WALK_TYPES.includes(type);
}

export async function fetchStravaActivities(
  userId: string,
  perPage: number = 200,
  page: number = 1
): Promise<StravaActivity[]> {
  const accessToken = await getValidAccessToken(userId);

  const response = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?per_page=${perPage}&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      // Token might be invalid, try refreshing
      const token = await getStravaToken(userId);
      if (token) {
        const refreshed = await refreshStravaToken(userId, token.refresh_token);
        return fetchStravaActivities(userId, perPage, page);
      }
    }
    throw new Error(`Failed to fetch Strava activities: ${response.statusText}`);
  }

  const activities: StravaActivity[] = await response.json();

  // Filter out walks and invalid activity types
  return activities.filter(
    (activity) => isValidActivityType(activity.type)
  );
}

export async function fetchAllStravaActivities(
  userId: string
): Promise<StravaActivity[]> {
  const allActivities: StravaActivity[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const activities = await fetchStravaActivities(userId, 200, page);
    allActivities.push(...activities);

    if (activities.length < 200) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allActivities;
}

