import type { RaceInputs, RunningAnalysis } from './race-planner';
import { format } from 'date-fns';

export interface PromptContext {
  inputs: RaceInputs;
  analysis: RunningAnalysis;
  rawRuns: Array<{
    date: Date;
    distance: number; // meters
    duration: number; // seconds
    pace: number; // seconds per km
  }>;
  calculatedMetrics: {
    goalPace: number; // seconds per km
    targetPeakMileage: number; // km/week
    trainingWeeks: number;
    baseWeeks: number;
    buildWeeks: number;
    sharpeningWeeks: number;
    taperWeeks: number;
    startMileage: number; // km/week
    easyPace: number; // seconds per km
    longPace: number; // seconds per km
    tempoPace: number; // seconds per km
    intervalPace: number; // seconds per km
    racePace: number; // seconds per km
    maxLongRun: number; // km
    daysPerWeek: number;
  };
}

function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function buildTrainingPlanPrompt(context: PromptContext): string {
  const { inputs, analysis, rawRuns, calculatedMetrics } = context;
  const raceDistanceKm = inputs.raceDistance / 1000;
  
  let prompt = `You are an elite running coach with over 30 years of experience training runners from beginners to Olympic qualifiers. You have a deep understanding of periodization, biomechanics, injury prevention, and the psychological aspects of training. Your coaching philosophy emphasizes progressive overload, adequate recovery, and long-term athlete development.

Your task is to create a personalized, comprehensive training plan for this runner. Draw upon your decades of experience to craft a plan that is both challenging and safe, tailored to their unique situation.

## RUNNER'S RACE GOAL

**Race Details:**
- Distance: ${raceDistanceKm} km ${raceDistanceKm === 5 ? '(5K)' : raceDistanceKm === 10 ? '(10K)' : raceDistanceKm === 21.1 ? '(Half Marathon)' : raceDistanceKm === 42.2 ? '(Marathon)' : ''}
- Race Date: ${format(new Date(inputs.raceDate), 'MMMM d, yyyy')}
- Goal Pace: ${formatPace(calculatedMetrics.goalPace)}
${inputs.goalTime ? `- Goal Time: ${formatTime(inputs.goalTime)}` : ''}

**Runner Profile:**
- Training Experience: ${inputs.trainingExperience || 'intermediate'} (beginner/intermediate/advanced)
- Current Weekly Mileage: ${(inputs.currentWeeklyMileage || analysis.weeklyVolume || 20).toFixed(1)} km/week
- Available Training Days: ${calculatedMetrics.daysPerWeek} days per week
- Preferred Long Run Day: ${inputs.preferredLongRunDay === 'saturday' ? 'Saturday' : 'Sunday'}
${inputs.injuryHistory ? `- Injury History: ${inputs.injuryHistory}` : '- Injury History: None reported'}

## PERFORMANCE ANALYSIS

**Overall Running History:**
- Total Runs Logged: ${analysis.totalRuns}
- Average Pace Across All Runs: ${formatPace(analysis.averagePace)}
- Best Recent Pace: ${formatPace(analysis.bestPace)}
- Recent Average Pace (Last 3 Months): ${formatPace(analysis.recentAveragePace)}
- Fitness Trend: ${analysis.fitnessTrend === 'improving' ? '📈 Improving - getting faster' : analysis.fitnessTrend === 'declining' ? '📉 Declining - pace slowing' : '➡️ Stable - consistent performance'}
- Current Weekly Volume: ${analysis.weeklyVolume.toFixed(1)} km/week
- Longest Run Completed: ${analysis.longestRun.toFixed(1)} km

**Recent Best Efforts by Distance:**
${analysis.recentBestEfforts.length > 0 
  ? analysis.recentBestEfforts.map(effort => 
      `- ${effort.distance} km: ${formatPace(effort.pace)} (${format(effort.date, 'MMM d, yyyy')})`
    ).join('\n')
  : '- No recent best efforts identified'}

**Recent Running Activity (Last 12 Runs):**
${rawRuns.slice(0, 12).map(run => 
  `- ${format(run.date, 'MMM d')}: ${(run.distance / 1000).toFixed(1)} km @ ${formatPace(run.pace)}`
).join('\n')}

## CALCULATED INSIGHTS & RECOMMENDATIONS

Based on the runner's profile and performance data, here are calculated insights to guide your plan:

**Goal Pace Analysis:**
- Estimated Realistic Goal Pace: ${formatPace(calculatedMetrics.goalPace)}
- Confidence Level: ${analysis.confidence} (${analysis.reasoning})

**Training Structure Recommendations:**
- Recommended Training Duration: ${calculatedMetrics.trainingWeeks} weeks
- Suggested Phase Breakdown:
  * Base Building: ${calculatedMetrics.baseWeeks} weeks (build aerobic foundation)
  * Build Phase: ${calculatedMetrics.buildWeeks} weeks (add intensity and volume)
  * Sharpening Phase: ${calculatedMetrics.sharpeningWeeks} weeks (race-specific work)
  * Taper Phase: ${calculatedMetrics.taperWeeks} weeks (reduce volume, maintain intensity)

**Mileage Progression:**
- Starting Weekly Mileage: ${calculatedMetrics.startMileage.toFixed(1)} km/week
- Target Peak Mileage: ${calculatedMetrics.targetPeakMileage.toFixed(1)} km/week
- Maximum Long Run Distance: ${calculatedMetrics.maxLongRun.toFixed(1)} km

**Pacing Zones (derived from goal pace):**
- Easy Pace: ${formatPace(calculatedMetrics.easyPace)} (conversation pace, aerobic development)
- Long Run Pace: ${formatPace(calculatedMetrics.longPace)} (same as easy, build endurance)
- Tempo/Threshold Pace: ${formatPace(calculatedMetrics.tempoPace)} (comfortably hard, lactate threshold)
- Interval Pace: ${formatPace(calculatedMetrics.intervalPace)} (hard but controlled, VO2 max)
- Race Pace: ${formatPace(calculatedMetrics.racePace)} (goal race pace)

## COACHING BEST PRACTICES & PRINCIPLES

As an experienced coach, apply these principles:

**Periodization:**
- Base Phase: Focus on building aerobic capacity through easy runs and gradual volume increases. Include strides 1-2x/week for neuromuscular development. No hard workouts yet.
- Build Phase: Introduce tempo runs and hill work. Extend long runs progressively. Maintain 80/20 easy-to-hard ratio.
- Sharpening Phase: Add intervals and race-pace segments. Include fast-finish long runs. Peak volume and intensity.
- Taper Phase: Reduce volume by 40-60% while maintaining some intensity. Focus on recovery and race preparation.

**Progression & Safety:**
- 10% Rule: Never increase weekly mileage or long run distance by more than 10% week-to-week
- Recovery Weeks: Include a recovery week (20-30% mileage reduction) every 3-4 weeks
- Hard Workouts: Maximum 2 hard workouts per week, never on consecutive days
- Rest Days: Always include at least 1 full rest day per week
- Easy Runs: Should comprise 80% of total training volume

**Workout Types:**
- Easy Runs: 60-90 seconds/km slower than goal pace. Should feel comfortable, conversational.
- Long Runs: Build from 30-50% of race distance up to 90-100% (half) or 32-35km (marathon). Same pace as easy runs.
- Tempo Runs: 10-20 seconds/km faster than goal pace. Start with 15-20 min, build to 30 min. Comfortably hard effort.
- Intervals: 30-45 seconds/km faster than goal pace. Typical sessions: 6x800m (5K), 5x1km (10K), 4x1.6km (half). Full recovery between reps.
- Race Pace Segments: Practice goal pace in later phases. Example: 2x3km at goal pace with recovery.
- Fast-Finish Long Runs: In peak weeks, run last 20-25% of long run at goal pace.

**Race-Specific Considerations:**
${raceDistanceKm <= 5 ? `
- 5K Focus: Speed and VO2 max development. Shorter intervals (400m-1km). Higher intensity, lower volume.
- Emphasize: Strides, short intervals, tempo runs. Long runs max 8-10km.
` : raceDistanceKm <= 10 ? `
- 10K Focus: Balance of speed and endurance. Medium intervals (800m-1.6km). Moderate volume.
- Emphasize: Tempo runs, intervals, moderate long runs (10-12km).
` : raceDistanceKm <= 21.1 ? `
- Half Marathon Focus: Aerobic capacity and lactate threshold. Longer tempo runs. Higher volume.
- Emphasize: Long runs up to 90% of race distance, extended tempo runs, race-pace segments.
` : `
- Marathon Focus: Maximum aerobic development. Very long runs (up to 32-35km). Lower intensity overall.
- Emphasize: Long runs are critical, tempo runs at marathon pace, conservative pacing throughout.
`}

**Injury Prevention:**
${inputs.injuryHistory ? `
- This runner has reported: ${inputs.injuryHistory}
- Be extra conservative with volume increases
- Include more recovery days if needed
- Focus on gradual progression
` : `
- Monitor for signs of overtraining
- Ensure adequate recovery between hard sessions
- Progress gradually, especially if coming from lower volume
`}

## YOUR COACHING TASK

Create a ${calculatedMetrics.trainingWeeks}-week training plan that:

1. **Starts conservatively** at ${calculatedMetrics.startMileage.toFixed(1)} km/week and builds progressively toward ${calculatedMetrics.targetPeakMileage.toFixed(1)} km/week
2. **Follows the phase structure** (${calculatedMetrics.baseWeeks} base, ${calculatedMetrics.buildWeeks} build, ${calculatedMetrics.sharpeningWeeks} sharpening, ${calculatedMetrics.taperWeeks} taper)
3. **Uses the pacing zones** provided above for each workout type
4. **Respects safety rules** (10% rule, recovery weeks, max 2 hard days/week, rest days)
5. **Is personalized** to this runner's experience level, current fitness, and goals
6. **Includes coaching notes** that explain the purpose of each workout and provide motivation

**Output Format:**
You must return a valid JSON object with this exact structure:
{
  "weeks": [
    {
      "weekNumber": 1,
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-07T00:00:00.000Z",
      "totalDistance": 25.5,
      "phase": "base",
      "workouts": [
        {
          "day": "Monday",
          "date": "2024-01-01T00:00:00.000Z",
          "type": "easy",
          "distance": 5,
          "pace": "6:00/km",
          "description": "Easy 5km run at conversation pace",
          "notes": "Focus on staying relaxed and comfortable"
        }
      ]
    }
  ]
}

Each week must have:
- weekNumber: number (1, 2, 3, etc.)
- startDate: string (ISO 8601 date format)
- endDate: string (ISO 8601 date format)
- totalDistance: number (total km for the week)
- phase: "base" | "build" | "sharpening" | "taper"
- workouts: array of workout objects

Each workout must have:
- day: string (day name like "Monday", "Tuesday", etc.)
- date: string (ISO 8601 date format, must be within the week's date range)
- type: "easy" | "tempo" | "interval" | "long" | "recovery" | "race" | "strides" | "race-pace"
- distance: number (km) OR duration: number (minutes) - at least one required
- pace: string (format like "5:30/km" or "5:30-6:00/km" for ranges)
- description: string (detailed workout description with specific instructions)
- notes: string (coaching advice, what to focus on, motivation)

**Critical Requirements:**
- Be specific with workout descriptions (e.g., "6x 800m at 4:00/km with 2min recovery jog between each")
- Include helpful coaching notes that explain the purpose and provide guidance
- Make the plan feel personal and tailored to this runner's situation
- Ensure all dates align correctly with the week structure (startDate to endDate)
- The final week must include the race day workout on the race date
- All workouts must have valid dates within their week's range
- Total weekly distance should match the sum of workout distances

Now, create the training plan as an experienced coach would for this runner. Return only the JSON object, no additional text.`;

  return prompt;
}

