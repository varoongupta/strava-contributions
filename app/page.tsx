'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Fitness Contributions
          </h1>
          <p className="text-xl text-gray-700 mb-2">
            Track your fitness journey like a developer tracks code
          </p>
          <p className="text-lg text-gray-600">
            Connect Strava and Apple Health to visualize your workouts
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Features
              </h2>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📊</div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      GitHub-style Heatmap
                    </div>
                    <div className="text-sm text-gray-600">
                      Visualize your activity patterns
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🔗</div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Strava Integration
                    </div>
                    <div className="text-sm text-gray-600">
                      Connect your Strava account
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🍎</div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Apple Health Support
                    </div>
                    <div className="text-sm text-gray-600">
                      Upload your health data
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🔄</div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Smart Deduplication
                    </div>
                    <div className="text-sm text-gray-600">
                      Automatically remove duplicates
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={() => signIn('strava')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors shadow-lg"
              >
                Get Started with Strava
              </button>
              <p className="mt-4 text-sm text-gray-600">
                You can also upload Apple Health data after signing in
              </p>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p>
            Built with Next.js, TypeScript, and Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  );
}
