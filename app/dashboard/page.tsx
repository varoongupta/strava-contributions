'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import ActivityStats from '@/components/ActivityStats';
import DataSourceManager from '@/components/DataSourceManager';
import HealthUploader from '@/components/HealthUploader';
import ShareableGenerator from '@/components/ShareableGenerator';
import type { Activity } from '@/types/activity';

interface Stats {
  year: {
    totalActivities: number;
    totalDuration: number;
    totalDistance: number;
    activeDays: number;
    firstActivity: string | null;
    lastActivity: string | null;
  };
  allTime: {
    totalActivities: number;
    totalDuration: number;
    totalDistance: number;
    activeDays: number;
    firstActivity: string | null;
    lastActivity: string | null;
  };
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Initialize database if needed (fire and forget)
      fetch('/api/init-db', { method: 'POST' }).catch(() => {
        // Ignore errors - database might already be initialized
      });

      // Fetch activities and stats in parallel
      const [activitiesRes, statsRes] = await Promise.all([
        fetch('/api/activities'),
        fetch('/api/stats'),
      ]);

      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        // Convert date strings to Date objects
        const activitiesWithDates = activitiesData.activities.map(
          (activity: any) => ({
            ...activity,
            date: new Date(activity.date),
            created_at: new Date(activity.created_at),
          })
        );
        setActivities(activitiesWithDates);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your fitness data...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Fitness Contributions
          </h1>
          <p className="text-gray-600">
            Track your fitness activities in a GitHub-style contribution graph
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-8">
            <ActivityStats {...stats} />
          </div>
        )}

        {/* Heatmap */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            Activity Heatmap
          </h2>
          {activities.length > 0 ? (
            <ActivityHeatmap activities={activities} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">No activities found.</p>
              <p className="text-sm">
                Connect your Strava account or upload Apple Health data to get started.
              </p>
            </div>
          )}
        </div>

        {/* Shareable Generator */}
        {stats && stats.year.totalActivities > 0 && (
          <div className="mb-8">
            <ShareableGenerator />
          </div>
        )}

        {/* Data Sources */}
        <div className="mb-8">
          <DataSourceManager />
        </div>

        {/* Apple Health Uploader */}
        <div className="mb-8">
          <HealthUploader />
        </div>

        {/* Race Training Planner */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2 text-gray-900">
                  Race Training Planner
                </h2>
                <p className="text-gray-600 text-sm">
                  Get a personalized training plan based on your running history
                </p>
              </div>
              <button
                disabled
                className="px-6 py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed opacity-60"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

