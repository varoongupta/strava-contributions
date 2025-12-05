'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TrainingPlanDisplay from '@/components/TrainingPlanDisplay';

interface RunningAnalysis {
  averagePace: number;
  bestPace: number;
  recentAveragePace: number;
  totalRuns: number;
  weeklyVolume: number;
  longestRun: number;
  suggestedGoalPace: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
}

export default function TrainForRace() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<RunningAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [raceDistance, setRaceDistance] = useState('5000'); // 5K default
  const [raceDate, setRaceDate] = useState('');
  const [goalTime, setGoalTime] = useState('');
  const [goalPace, setGoalPace] = useState('');
  const [currentWeeklyMileage, setCurrentWeeklyMileage] = useState('');
  const [trainingExperience, setTrainingExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [availableDaysPerWeek, setAvailableDaysPerWeek] = useState('4');
  const [preferredLongRunDay, setPreferredLongRunDay] = useState('sunday');
  const [injuryHistory, setInjuryHistory] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchAnalysis();
      // Set default race date to 12 weeks from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 84);
      setRaceDate(defaultDate.toISOString().split('T')[0]);
    }
  }, [status, router]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/race-planner/analyze');
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
        // Set suggested goal pace
        if (data.suggestedGoalPace) {
          const minutes = Math.floor(data.suggestedGoalPace / 60);
          const seconds = Math.floor(data.suggestedGoalPace % 60);
          setGoalPace(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
        if (data.weeklyVolume) {
          setCurrentWeeklyMileage(Math.round(data.weeklyVolume).toString());
        }
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPaceToSeconds = (paceString: string): number => {
    // Format: "5:30" or "5:30/km"
    const parts = paceString.replace('/km', '').split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);
      return minutes * 60 + seconds;
    }
    return 0;
  };

  const formatTimeToSeconds = (timeString: string): number => {
    // Format: "25:00" (MM:SS)
    const parts = timeString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);
      return minutes * 60 + seconds;
    }
    return 0;
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      
      const goalPaceSeconds = goalPace ? formatPaceToSeconds(goalPace) : undefined;
      const goalTimeSeconds = goalTime ? formatTimeToSeconds(goalTime) : undefined;

      const response = await fetch('/api/race-planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceDistance: parseFloat(raceDistance) * 1000, // Convert km to meters
          raceDate,
          goalTime: goalTimeSeconds,
          goalPace: goalPaceSeconds,
          currentWeeklyMileage: currentWeeklyMileage ? parseFloat(currentWeeklyMileage) : undefined,
          trainingExperience,
          availableDaysPerWeek: parseInt(availableDaysPerWeek),
          preferredLongRunDay,
          injuryHistory: injuryHistory || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPlan(data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Failed to generate training plan. Please check your inputs.');
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      alert('Failed to generate training plan');
    } finally {
      setGenerating(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing your running data...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (plan) {
    return <TrainingPlanDisplay plan={plan} onBack={() => setPlan(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-orange-500 hover:text-orange-600 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Train for a Race
          </h1>
          <p className="text-gray-600">
            Get a personalized training plan based on your running history
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold mb-6 text-gray-900">Race Information</h2>
          
          <div className="space-y-6">
            {/* Race Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Race Distance (km)
              </label>
              <select
                value={raceDistance}
                onChange={(e) => setRaceDistance(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="5000">5K</option>
                <option value="10000">10K</option>
                <option value="21097.5">Half Marathon (21.1K)</option>
                <option value="42195">Marathon (42.2K)</option>
                <option value="custom">Custom</option>
              </select>
              {raceDistance === 'custom' && (
                <input
                  type="number"
                  placeholder="Enter distance in km"
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  onChange={(e) => setRaceDistance(e.target.value)}
                />
              )}
            </div>

            {/* Race Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Race Date
              </label>
              <input
                type="date"
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Goal Pace */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Goal Pace (min/km)
              </label>
              <input
                type="text"
                value={goalPace}
                onChange={(e) => setGoalPace(e.target.value)}
                placeholder="5:30"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {analysis && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Suggested: {Math.floor(analysis.suggestedGoalPace / 60)}:
                    {Math.floor(analysis.suggestedGoalPace % 60).toString().padStart(2, '0')}/km
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ {analysis.reasoning}
                  </p>
                </div>
              )}
            </div>

            {/* Goal Time (Alternative) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Goal Time (MM:SS) - Optional
              </label>
              <input
                type="text"
                value={goalTime}
                onChange={(e) => setGoalTime(e.target.value)}
                placeholder="25:00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank if you've entered goal pace above
              </p>
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-xl font-bold text-gray-900">Advanced Options</h2>
            <span className="text-orange-500">{showAdvanced ? '−' : '+'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Weekly Mileage (km/week)
                </label>
                <input
                  type="number"
                  value={currentWeeklyMileage}
                  onChange={(e) => setCurrentWeeklyMileage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Experience
                </label>
                <select
                  value={trainingExperience}
                  onChange={(e) => setTrainingExperience(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days Available Per Week
                </label>
                <select
                  value={availableDaysPerWeek}
                  onChange={(e) => setAvailableDaysPerWeek(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="3">3 days</option>
                  <option value="4">4 days</option>
                  <option value="5">5 days</option>
                  <option value="6">6 days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Long Run Day
                </label>
                <select
                  value={preferredLongRunDay}
                  onChange={(e) => setPreferredLongRunDay(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="sunday">Sunday</option>
                  <option value="saturday">Saturday</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Injury History (optional)
                </label>
                <textarea
                  value={injuryHistory}
                  onChange={(e) => setInjuryHistory(e.target.value)}
                  placeholder="Any past injuries or concerns?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !raceDate || (!goalPace && !goalTime)}
          className={`
            w-full py-4 px-6 rounded-lg font-semibold text-white text-lg
            transition-all duration-200
            ${generating || !raceDate || (!goalPace && !goalTime)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600 hover:shadow-lg'
            }
          `}
        >
          {generating ? 'Generating Your Training Plan...' : 'Generate Training Plan'}
        </button>
      </div>
    </div>
  );
}

