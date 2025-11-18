import { sql } from '@vercel/postgres';

export interface User {
  id: string;
  email: string;
  strava_id?: number;
  created_at: Date;
}

export interface StravaToken {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

// Initialize database tables
export async function initDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        strava_id INTEGER UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create strava_tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS strava_tokens (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create activities table
    await sql`
      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source TEXT NOT NULL CHECK (source IN ('strava', 'apple_health')),
        type TEXT NOT NULL,
        date TIMESTAMP NOT NULL,
        duration INTEGER NOT NULL,
        distance INTEGER,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, source, date, type)
      )
    `;

    // Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_activities_user_date 
      ON activities(user_id, date DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_activities_user_source 
      ON activities(user_id, source)
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// User operations
export async function createUser(email: string, stravaId?: number) {
  const result = await sql<User>`
    INSERT INTO users (email, strava_id)
    VALUES (${email}, ${stravaId || null})
    ON CONFLICT (email) 
    DO UPDATE SET strava_id = COALESCE(EXCLUDED.strava_id, users.strava_id)
    RETURNING *
  `;
  return result.rows[0];
}

export async function getUserByEmail(email: string) {
  const result = await sql<User>`
    SELECT * FROM users WHERE email = ${email}
  `;
  return result.rows[0];
}

export async function getUserById(id: string) {
  const result = await sql<User>`
    SELECT * FROM users WHERE id = ${id}
  `;
  return result.rows[0];
}

// Strava token operations
export async function saveStravaToken(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
) {
  await sql`
    INSERT INTO strava_tokens (user_id, access_token, refresh_token, expires_at)
    VALUES (${userId}, ${accessToken}, ${refreshToken}, ${expiresAt})
    ON CONFLICT (user_id)
    DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `;
}

export async function getStravaToken(userId: string) {
  const result = await sql<StravaToken>`
    SELECT * FROM strava_tokens WHERE user_id = ${userId}
  `;
  return result.rows[0];
}

// Activity operations
export async function saveActivity(activity: {
  userId: string;
  source: 'strava' | 'apple_health';
  type: string;
  date: Date;
  duration: number;
  distance?: number;
  metadata?: Record<string, unknown>;
}) {
  await sql`
    INSERT INTO activities (user_id, source, type, date, duration, distance, metadata)
    VALUES (
      ${activity.userId},
      ${activity.source},
      ${activity.type},
      ${activity.date},
      ${activity.duration},
      ${activity.distance || null},
      ${activity.metadata ? JSON.stringify(activity.metadata) : null}
    )
    ON CONFLICT (user_id, source, date, type)
    DO UPDATE SET
      duration = EXCLUDED.duration,
      distance = EXCLUDED.distance,
      metadata = EXCLUDED.metadata
  `;
}

export async function getActivities(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  let query = sql`
    SELECT * FROM activities
    WHERE user_id = ${userId}
  `;

  if (startDate) {
    query = sql`
      ${query}
      AND date >= ${startDate}
    `;
  }

  if (endDate) {
    query = sql`
      ${query}
      AND date <= ${endDate}
    `;
  }

  query = sql`
    ${query}
    ORDER BY date DESC
  `;

  const result = await query;
  return result.rows;
}

export async function getActivityStats(userId: string) {
  const result = await sql`
    SELECT 
      COUNT(*) as total_activities,
      SUM(duration) as total_duration,
      SUM(distance) as total_distance,
      COUNT(DISTINCT DATE(date)) as active_days,
      MIN(date) as first_activity,
      MAX(date) as last_activity
    FROM activities
    WHERE user_id = ${userId}
  `;
  return result.rows[0];
}

