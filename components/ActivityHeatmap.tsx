'use client';

import React, { useMemo, useState } from 'react';
import { format, startOfWeek, subWeeks, isSameDay } from 'date-fns';
import type { Activity } from '@/types/activity';

interface ActivityHeatmapProps {
  activities: Activity[];
  year?: number;
}

const STRAVA_COLORS = {
  level0: '#ebedf0', // No activity
  level1: '#ffd4a3', // 1 activity
  level2: '#ffb366', // 2-3 activities
  level3: '#ff9233', // 4-5 activities
  level4: '#ff7100', // 6+ activities
};

function getActivityLevel(count: number): keyof typeof STRAVA_COLORS {
  if (count === 0) return 'level0';
  if (count === 1) return 'level1';
  if (count >= 2 && count <= 3) return 'level2';
  if (count >= 4 && count <= 5) return 'level3';
  return 'level4';
}

export default function ActivityHeatmap({ activities, year = new Date().getFullYear() }: ActivityHeatmapProps) {
  const { weeks, activityCounts, maxCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a map of date -> activity count
    const counts = new Map<string, number>();
    activities.forEach((activity) => {
      const activityDate = new Date(activity.date);
      activityDate.setHours(0, 0, 0, 0);
      const dateKey = format(activityDate, 'yyyy-MM-dd');
      counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
    });

    // Generate weeks (52 weeks from today backwards)
    const weeks: Date[][] = [];
    const endDate = today;
    const startDate = subWeeks(endDate, 51);
    const startWeek = startOfWeek(startDate, { weekStartsOn: 0 }); // Sunday

    for (let i = 0; i < 52; i++) {
      const weekStart = new Date(startWeek);
      weekStart.setDate(weekStart.getDate() + i * 7);
      weekStart.setHours(0, 0, 0, 0);

      const week: Date[] = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + day);
        date.setHours(0, 0, 0, 0);
        week.push(date);
      }
      weeks.push(week);
    }

    let maxCount = 0;
    counts.forEach((count) => {
      if (count > maxCount) maxCount = count;
    });

    return { weeks, activityCounts: counts, maxCount };
  }, [activities, year]);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const selectedCount = selectedDay
    ? activityCounts.get(format(selectedDay, 'yyyy-MM-dd')) || 0
    : null;

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex gap-1 p-4">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const count = activityCounts.get(dateKey) || 0;
                const level = getActivityLevel(count);
                const isToday = isSameDay(day, new Date());
                const isFuture = day > new Date();
                const isSelected = selectedDay && isSameDay(day, selectedDay);

                return (
                  <button
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                      w-3 h-3 rounded-sm transition-all
                      ${isFuture ? 'opacity-30' : ''}
                      ${isSelected ? 'ring-2 ring-offset-2 ring-orange-500' : ''}
                      ${isToday ? 'ring-1 ring-offset-1 ring-orange-600' : ''}
                    `}
                    style={{
                      backgroundColor: isFuture ? STRAVA_COLORS.level0 : STRAVA_COLORS[level],
                    }}
                    onClick={() => setSelectedDay(day)}
                    onMouseEnter={() => setSelectedDay(day)}
                    onMouseLeave={() => setSelectedDay(null)}
                    title={`${format(day, 'MMM d, yyyy')}: ${count} ${count === 1 ? 'activity' : 'activities'}`}
                    aria-label={`${format(day, 'MMM d, yyyy')}: ${count} activities`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selectedDay && selectedCount !== null && (
        <div className="mt-4 text-center text-sm text-gray-600">
          <strong>{format(selectedDay, 'MMMM d, yyyy')}</strong>
          {' - '}
          {selectedCount} {selectedCount === 1 ? 'activity' : 'activities'}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STRAVA_COLORS.level0 }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STRAVA_COLORS.level1 }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STRAVA_COLORS.level2 }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STRAVA_COLORS.level3 }} />
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STRAVA_COLORS.level4 }} />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

