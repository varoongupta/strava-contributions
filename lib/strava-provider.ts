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
    ...options,
    id: 'strava',
    name: 'Strava',
    type: 'oauth',
    checks: [], // Disable PKCE - Strava doesn't support it
    authorization: {
      url: 'https://www.strava.com/api/v3/oauth/authorize',
      params: {
        scope: 'activity:read_all',
        approval_prompt: 'force',
        response_type: 'code',
      },
    },
    token: {
      url: 'https://www.strava.com/api/v3/oauth/token',
      async request(context: any) {
        console.log('=== CUSTOM TOKEN REQUEST CALLED ===');
        const { provider, params } = context;
        const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/strava`;
        
        // Strava requires redirect_uri in token exchange
        const body = new URLSearchParams({
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
          code: params.code as string,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        });
        
        console.log('Making Strava token request with redirect_uri:', redirectUri);
        
        const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });
        
        const responseText = await response.text();
        console.log('Strava token response status:', response.status);
        console.log('Strava token response:', responseText.substring(0, 200));
        
        if (!response.ok) {
          throw new Error(`Strava token request failed: ${response.status} ${responseText}`);
        }
        
        const tokens = JSON.parse(responseText);
        
        return {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
          token_type: tokens.token_type || 'Bearer',
          scope: tokens.scope,
        };
      },
    },
    userinfo: 'https://www.strava.com/api/v3/athlete',
    client: {
      token_endpoint_auth_method: 'client_secret_post',
    },
    profile(profile) {
      return {
        id: profile.id.toString(),
        email: profile.email || `${profile.id}@strava.local`,
        name: `${profile.firstname} ${profile.lastname}`,
        image: profile.profile,
      };
    },
  };
}

