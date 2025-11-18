'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function DataSourceManager() {
  const { data: session, status } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleStravaSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/strava/activities', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setSyncMessage(
          `Successfully synced ${data.activitiesSaved} activities from Strava!`
        );
        // Refresh the page after 2 seconds to show new activities
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSyncMessage(`Error: ${data.error || 'Failed to sync activities'}`);
      }
    } catch (error) {
      setSyncMessage('Error syncing activities. Please try again.');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-900">
        Data Sources
      </h2>

      <div className="space-y-4">
        {/* Strava Connection */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
              S
            </div>
            <div>
              <div className="font-semibold text-gray-900">Strava</div>
              <div className="text-sm text-gray-600">
                {session?.user ? 'Connected' : 'Not connected'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {session?.user ? (
              <>
                <button
                  onClick={handleStravaSync}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn('strava')}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
              >
                Connect Strava
              </button>
            )}
          </div>
        </div>

        {/* Apple Health */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">
              🍎
            </div>
            <div>
              <div className="font-semibold text-gray-900">Apple Health</div>
              <div className="text-sm text-gray-600">
                Upload export file
              </div>
            </div>
          </div>
        </div>

        {syncMessage && (
          <div
            className={`p-3 rounded-lg text-sm ${
              syncMessage.includes('Error')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            {syncMessage}
          </div>
        )}
      </div>
    </div>
  );
}

