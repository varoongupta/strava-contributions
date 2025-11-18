import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
  }
}

declare module '@auth/core/types' {
  interface Account {
    expires_at?: number;
  }
}

