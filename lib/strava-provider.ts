import type { OAuthConfig, OAuthUserConfig } from '@auth/core/providers/oauth';

export interface StravaProfile {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email?: string;
  profile?: string;
  city?: string;
  state?: string;
  country?: string;
  sex?: string;
  premium?: boolean;
  summit?: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function Strava(
  options: OAuthUserConfig<StravaProfile>
): OAuthConfig<StravaProfile> {
  return {
    id: 'strava',
    name: 'Strava',
    type: 'oauth',
    authorization: {
      url: 'https://www.strava.com/oauth/authorize',
      params: {
        scope: 'activity:read_all',
        approval_prompt: 'force',
        response_type: 'code',
      },
    },
    token: 'https://www.strava.com/oauth/token',
    userinfo: {
      url: 'https://www.strava.com/api/v3/athlete',
      async request({ tokens }) {
        const response = await fetch('https://www.strava.com/api/v3/athlete', {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });
        return await response.json();
      },
    },
    profile(profile) {
      return {
        id: profile.id.toString(),
        email: profile.email || `${profile.id}@strava.local`,
        name: `${profile.firstname} ${profile.lastname}`,
        image: profile.profile,
      };
    },
    ...options,
  };
}

