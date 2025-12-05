'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface TrainingPlanDisplayProps {
  plan: {
    plan: Array<{
      weekNumber: number;
      startDate: string;
      endDate: string;
      totalDistance: number;
      phase: 'base' | 'build' | 'sharpening' | 'taper';
      workouts: Array<{
        day: string;
        date: string;
        type: string;
        distance?: number;
        duration?: number;
        pace?: string;
        description: string;
        notes?: string;
      }>;
    }>;
    analysis: any;
    inputs: any;
  };
  onBack: () => void;
}

export default function TrainingPlanDisplay({ plan, onBack }: TrainingPlanDisplayProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1, 2, 3])); // Expand first 3 weeks by default

  const toggleWeek = (weekNum: number) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekNum)) {
      newExpanded.delete(weekNum);
    } else {
      newExpanded.add(weekNum);
    }
    setExpandedWeeks(newExpanded);
  };

  const downloadPlan = () => {
    // Create a printable/downloadable version
    const content = generatePlanText(plan);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-plan-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatPace = (secondsPerKm: number): string => {
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  };

  const generatePlanText = (plan: any): string => {
    let text = 'TRAINING PLAN\n';
    text += '='.repeat(50) + '\n\n';
    text += `Race Distance: ${plan.inputs.raceDistance / 1000} km\n`;
    text += `Race Date: ${format(new Date(plan.inputs.raceDate), 'MMMM d, yyyy')}\n`;
    text += `Goal Pace: ${plan.inputs.goalPace ? formatPace(plan.inputs.goalPace) : 'N/A'}\n\n`;
    
    plan.plan.forEach((week: any) => {
      text += `\nWEEK ${week.weekNumber}\n`;
      text += '-'.repeat(50) + '\n';
      text += `${format(new Date(week.startDate), 'MMM d')} - ${format(new Date(week.endDate), 'MMM d, yyyy')}\n`;
      text += `Total Distance: ${week.totalDistance} km\n\n`;
      
      week.workouts.forEach((workout: any) => {
        text += `${workout.day} (${format(new Date(workout.date), 'MMM d')})\n`;
        text += `  Type: ${workout.type.toUpperCase()}\n`;
        if (workout.distance) {
          text += `  Distance: ${workout.distance} km\n`;
        }
        if (workout.duration) {
          text += `  Duration: ${workout.duration} min\n`;
        }
        if (workout.pace) {
          text += `  Pace: ${workout.pace}\n`;
        }
        text += `  ${workout.description}\n`;
        if (workout.notes) {
          text += `  Notes: ${workout.notes}\n`;
        }
        text += '\n';
      });
    });
    
    return text;
  };

  const getWorkoutColor = (type: string) => {
    switch (type) {
      case 'long':
        return 'bg-orange-100 border-orange-300';
      case 'tempo':
        return 'bg-red-100 border-red-300';
      case 'interval':
        return 'bg-purple-100 border-purple-300';
      case 'race':
        return 'bg-yellow-100 border-yellow-400';
      case 'race-pace':
        return 'bg-blue-100 border-blue-300';
      case 'strides':
        return 'bg-green-100 border-green-300';
      case 'recovery':
        return 'bg-gray-100 border-gray-300';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-orange-500 hover:text-orange-600 flex items-center gap-2"
          >
            ← Back to Input
          </button>
          <button
            onClick={downloadPlan}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Plan
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Training Plan</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Race Distance</p>
              <p className="font-semibold text-lg">{plan.inputs.raceDistance / 1000} km</p>
            </div>
            <div>
              <p className="text-gray-600">Race Date</p>
              <p className="font-semibold text-lg">{format(new Date(plan.inputs.raceDate), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-gray-600">Goal Pace</p>
              <p className="font-semibold text-lg">
                {plan.inputs.goalPace ? formatPace(plan.inputs.goalPace) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Total Weeks</p>
              <p className="font-semibold text-lg">{plan.plan.length} weeks</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {plan.plan.map((week) => (
            <div
              key={week.weekNumber}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleWeek(week.weekNumber)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-orange-500">Week {week.weekNumber}</span>
                  <span className="text-xs uppercase font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    {week.phase}
                  </span>
                  <span className="text-gray-600">
                    {format(new Date(week.startDate), 'MMM d')} - {format(new Date(week.endDate), 'MMM d, yyyy')}
                  </span>
                  <span className="text-gray-500">• {week.totalDistance} km total</span>
                </div>
                <span className="text-gray-400">
                  {expandedWeeks.has(week.weekNumber) ? '−' : '+'}
                </span>
              </button>

              {expandedWeeks.has(week.weekNumber) && (
                <div className="px-6 pb-6 space-y-3">
                  {week.workouts.map((workout, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${getWorkoutColor(workout.type)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {workout.day} - {format(new Date(workout.date), 'MMM d')}
                          </h3>
                          <p className="text-sm text-gray-600 uppercase font-medium mt-1">
                            {workout.type}
                          </p>
                        </div>
                        {workout.distance && (
                          <span className="text-lg font-bold text-gray-900">
                            {workout.distance} km
                          </span>
                        )}
                      </div>
                      {workout.pace && (
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-medium">Pace:</span> {workout.pace}
                        </p>
                      )}
                      {workout.duration && (
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-medium">Duration:</span> {workout.duration} min
                        </p>
                      )}
                      <p className="text-gray-700 mb-1">{workout.description}</p>
                      {workout.notes && (
                        <p className="text-sm text-gray-600 italic mt-2">💡 {workout.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

