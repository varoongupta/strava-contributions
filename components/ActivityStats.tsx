'use client';

import { format } from 'date-fns';

interface ActivityStatsProps {
  totalActivities: number;
  totalDuration: number; // in seconds
  totalDistance: number; // in meters
  activeDays: number;
  firstActivity: string | null;
  lastActivity: string | null;
}

export default function ActivityStats({
  totalActivities,
  totalDuration,
  totalDistance,
  activeDays,
  firstActivity,
  lastActivity,
}: ActivityStatsProps) {
  const formatDurationString = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistanceString = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  const stats = [
    {
      label: 'Total Activities',
      value: totalActivities.toLocaleString(),
      icon: '🏃',
    },
    {
      label: 'Active Days',
      value: activeDays.toLocaleString(),
      icon: '📅',
    },
    {
      label: 'Total Time',
      value: formatDurationString(totalDuration),
      icon: '⏱️',
    },
    {
      label: 'Total Distance',
      value: formatDistanceString(totalDistance),
      icon: '📏',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg bg-white p-4 shadow-sm border border-gray-200"
        >
          <div className="text-2xl mb-2">{stat.icon}</div>
          <div className="text-2xl font-bold text-orange-600 mb-1">
            {stat.value}
          </div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
      {(firstActivity || lastActivity) && (
        <div className="col-span-2 md:col-span-4 mt-4 text-sm text-gray-600">
          {firstActivity && (
            <div>
              <strong>First Activity:</strong>{' '}
              {format(new Date(firstActivity), 'MMMM d, yyyy')}
            </div>
          )}
          {lastActivity && (
            <div>
              <strong>Last Activity:</strong>{' '}
              {format(new Date(lastActivity), 'MMMM d, yyyy')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

