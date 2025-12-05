import NextAuth from 'next-auth';
import Strava from '@/lib/strava-provider';
import { createUser, getUserByEmail } from '@/lib/db';
import { saveStravaToken } from '@/lib/db';

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET is not set');
}

if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
  console.warn('Strava credentials not set - OAuth will not work');
}

// Initialize provider separately to catch any errors
let stravaProvider;
try {
  if (process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET) {
    stravaProvider = Strava({
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'activity:read_all',
        },
      },
    });
    console.log('Strava provider initialized successfully');
  }
} catch (error: any) {
  console.error('Error initializing Strava provider:', error);
  console.error('Error stack:', error.stack);
}

let nextAuthConfig;
try {
  nextAuthConfig = {
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    debug: process.env.NODE_ENV === 'development',
    providers: stravaProvider ? [stravaProvider] : [],
    callbacks: {
      async signIn({ user, account, profile }: { user: any; account?: any; profile?: any }) {
      if (account?.provider === 'strava' && account.access_token && account.refresh_token) {
        try {
          // Get or create user
          let dbUser = await getUserByEmail(user.email!);
          const stravaId = (profile as any)?.id || (user.id ? parseInt(user.id) : undefined);
          
          if (!dbUser) {
            dbUser = await createUser(user.email!, stravaId);
          } else if (!dbUser.strava_id && stravaId) {
            // Update user with Strava ID if not set
            const { sql } = await import('@vercel/postgres');
            await sql`
              UPDATE users 
              SET strava_id = ${stravaId}
              WHERE id = ${dbUser.id}
            `;
            dbUser.strava_id = stravaId;
          }

          // Save Strava tokens
          const expiresAt = account.expires_at 
            ? new Date(account.expires_at * 1000)
            : new Date(Date.now() + 6 * 60 * 60 * 1000); // Default 6 hours
          await saveStravaToken(
            dbUser.id,
            account.access_token,
            account.refresh_token,
            expiresAt
          );

          return true;
        } catch (error) {
          console.error('Error in signIn callback:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }: { session: any; token?: any }) {
      if (session.user?.email) {
        const user = await getUserByEmail(session.user.email);
        if (user) {
          session.user.id = user.id;
        }
      }
      return session;
    },
    },
    pages: {
      signIn: '/',
    },
  };
  console.log('NextAuth config created with', nextAuthConfig.providers.length, 'providers');
} catch (error: any) {
  console.error('Error creating NextAuth config:', error);
  throw error;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...nextAuthConfig,
  // Force disable PKCE globally if needed
  experimental: {
    enableWebAuthn: false,
  },
});

