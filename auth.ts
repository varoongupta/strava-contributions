import NextAuth from 'next-auth';
import Strava from '@/lib/strava-provider';
import { createUser, getUserByEmail } from '@/lib/db';
import { saveStravaToken } from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Strava({
      clientId: process.env.STRAVA_CLIENT_ID!,
      clientSecret: process.env.STRAVA_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'activity:read_all',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
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
    async session({ session, token }) {
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
});

