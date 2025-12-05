'use client';

import { format } from 'date-fns';

interface YearStats {
  totalActivities: number;
  totalDuration: number; // in seconds
  totalDistance: number; // in meters
  activeDays: number;
  firstActivity: string | null;
  lastActivity: string | null;
}

interface ActivityStatsProps {
  year: YearStats;
  allTime: YearStats;
}

export default function ActivityStats({
  year,
  allTime,
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

  const yearStats = [
    {
      label: 'Total Activities',
      value: year.totalActivities.toLocaleString(),
      allTimeValue: allTime.totalActivities.toLocaleString(),
      icon: '🏃',
    },
    {
      label: 'Active Days',
      value: year.activeDays.toLocaleString(),
      allTimeValue: allTime.activeDays.toLocaleString(),
      icon: '📅',
    },
    {
      label: 'Total Time',
      value: formatDurationString(year.totalDuration),
      allTimeValue: formatDurationString(allTime.totalDuration),
      icon: '⏱️',
    },
    {
      label: 'Total Distance',
      value: formatDistanceString(year.totalDistance),
      allTimeValue: formatDistanceString(allTime.totalDistance),
      icon: '📏',
    },
  ];

  return (
    <div>
      {/* Past 365 Days - Prominent */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Past 365 Days</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {yearStats.map((stat) => (
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
        </div>
      </div>

      {/* All Time - Less Prominent, Aligned Below */}
      <div className="mt-2">
        <div className="flex items-center gap-4">
          <div className="w-24 md:w-32 flex-shrink-0">
            <span className="text-xs font-medium text-gray-500">All Time</span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 flex-1">
            {yearStats.map((stat) => (
              <div
                key={stat.label}
                className="text-center"
              >
                <div className="text-sm font-medium text-gray-700">
                  {stat.allTimeValue}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Dates */}
      {(year.firstActivity || year.lastActivity) && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
          {year.firstActivity && (
            <div>
              <strong>First Activity (Past Year):</strong>{' '}
              {format(new Date(year.firstActivity), 'MMMM d, yyyy')}
            </div>
          )}
          {year.lastActivity && (
            <div>
              <strong>Last Activity:</strong>{' '}
              {format(new Date(year.lastActivity), 'MMMM d, yyyy')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

