import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getActivities, getActivityStats, getTopActivityTypes } from '@/lib/db';
import { formatHealthTypeName } from '@/lib/healthParser';
import { createCanvas } from 'canvas';
import { format, startOfWeek, subWeeks, subDays } from 'date-fns';

// Instagram Stories dimensions: 1080x1920
const WIDTH = 1080;
const HEIGHT = 1920;

// Strava brand colors
const STRAVA_COLORS = {
  // Heatmap colors (lighter for dark background)
  level0: '#2d2d2d', // Dark grey for no activity
  level1: '#ff6b35', // Light orange
  level2: '#ff5722', // Medium orange
  level3: '#ff4500', // Dark orange
  level4: '#FC4C02', // Strava orange
  // UI colors
  background: '#0a0a0a', // Very dark background
  backgroundSecondary: '#1a1a1a', // Slightly lighter dark
  text: '#ffffff', // White text
  textSecondary: '#b0b0b0', // Light grey
  accent: '#FC4C02', // Strava orange
  accentLight: '#ff6b35', // Light orange
} as const;

function getActivityLevel(count: number): 'level0' | 'level1' | 'level2' | 'level3' | 'level4' {
  if (count === 0) return 'level0';
  if (count === 1) return 'level1';
  if (count >= 2 && count <= 3) return 'level2';
  if (count >= 4 && count <= 5) return 'level3';
  return 'level4';
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km >= 1) {
    return `${km.toFixed(1)} km`;
  }
  return `${meters.toFixed(0)} m`;
}

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;

    // Calculate date range for past year (365 days)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const oneYearAgo = subDays(today, 365);
    oneYearAgo.setHours(0, 0, 0, 0);

    // Fetch data for past year only
    const activities = await getActivities(userId, oneYearAgo, today);
    const stats = await getActivityStats(userId, oneYearAgo, today);
    
    // Check if user has 5+ different activities with 10+ activities each
    const allTopTypes = await getTopActivityTypes(userId, 100, oneYearAgo, today); // Get all types
    const typesWith10Plus = allTopTypes.filter(type => parseInt(type.count) >= 10);
    const shouldShowTop5 = typesWith10Plus.length >= 5;
    const topLimit = shouldShowTop5 ? 5 : 3;
    const topTypes = allTopTypes.slice(0, topLimit);

    // Create canvas
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // Dark background
    ctx.fillStyle = STRAVA_COLORS.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Add subtle texture/gradient overlay
    const overlayGradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    overlayGradient.addColorStop(0, 'rgba(252, 76, 2, 0.05)');
    overlayGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    overlayGradient.addColorStop(1, 'rgba(252, 76, 2, 0.05)');
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Header section with Strava-style branding
    const headerY = 100;
    
    // "YEAR IN FITNESS" subtitle
    ctx.fillStyle = STRAVA_COLORS.text;
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('YEAR IN FITNESS', WIDTH / 2, headerY);
    
    // Year badge
    const yearText = new Date().getFullYear().toString();
    ctx.fillStyle = STRAVA_COLORS.accent;
    ctx.font = 'bold 48px Arial';
    ctx.fillText(yearText, WIDTH / 2, headerY + 80);

    // Main stats section - more compact layout
    let yPos = headerY + 160;

    // Stats in a 2x2 grid layout
    const statsLeftX = WIDTH / 4;
    const statsRightX = (3 * WIDTH) / 4;
    const statSpacing = 180;
    
    // Total Activities (Top Left)
    const totalActivities = parseInt(stats.total_activities || '0');
    ctx.fillStyle = STRAVA_COLORS.text;
    ctx.font = 'bold 88px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(totalActivities.toString(), statsLeftX, yPos);
    ctx.fillStyle = STRAVA_COLORS.textSecondary;
    ctx.font = '32px Arial';
    ctx.fillText('TOTAL ACTIVITIES', statsLeftX, yPos + 60);
    
    // Total Duration (Top Right)
    const totalDuration = parseFloat(stats.total_duration || '0');
    const durationText = formatDuration(totalDuration);
    ctx.fillStyle = STRAVA_COLORS.text;
    ctx.font = 'bold 88px Arial';
    ctx.fillText(durationText, statsRightX, yPos);
    ctx.fillStyle = STRAVA_COLORS.textSecondary;
    ctx.font = '32px Arial';
    ctx.fillText('TOTAL TIME', statsRightX, yPos + 60);
    
    yPos += statSpacing;
    
    // Total Distance (Bottom Left)
    const totalDistance = parseFloat(stats.total_distance || '0');
    if (totalDistance > 0) {
      const distanceText = formatDistance(totalDistance);
      ctx.fillStyle = STRAVA_COLORS.text;
      ctx.font = 'bold 88px Arial';
      ctx.fillText(distanceText, statsLeftX, yPos);
      ctx.fillStyle = STRAVA_COLORS.textSecondary;
      ctx.font = '32px Arial';
      ctx.fillText('TOTAL DISTANCE', statsLeftX, yPos + 60);
    }
    
    // Active Days (Bottom Right)
    const activeDays = parseInt(stats.active_days || '0');
    ctx.fillStyle = STRAVA_COLORS.text;
    ctx.font = 'bold 88px Arial';
    ctx.fillText(activeDays.toString(), statsRightX, yPos);
    ctx.fillStyle = STRAVA_COLORS.textSecondary;
    ctx.font = '32px Arial';
    ctx.fillText('ACTIVE DAYS', statsRightX, yPos + 60);
    
    yPos += 200;

    // Top Activity Types - Strava style
    if (topTypes.length > 0) {
      ctx.fillStyle = STRAVA_COLORS.accent;
      ctx.font = 'bold 44px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TOP ACTIVITIES', WIDTH / 2, yPos);
      yPos += 80;

      topTypes.forEach((type, index) => {
        // Check if it's an Apple Health type (starts with HKWorkoutActivityType)
        let typeName: string;
        if (type.type.startsWith('HKWorkoutActivityType')) {
          typeName = formatHealthTypeName(type.type);
        } else {
          // Strava or mapped types - format normally
          typeName = type.type.charAt(0).toUpperCase() + type.type.slice(1).replace(/([A-Z])/g, ' $1');
        }
        const count = parseInt(type.count);
        
        // Highlight #1 with orange
        if (index === 0) {
          ctx.fillStyle = STRAVA_COLORS.accent;
        } else {
          ctx.fillStyle = STRAVA_COLORS.text;
        }
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`#${index + 1} ${typeName}`, WIDTH / 2, yPos);
        
        ctx.fillStyle = STRAVA_COLORS.textSecondary;
        ctx.font = '32px Arial';
        ctx.fillText(`${count} activities`, WIDTH / 2, yPos + 45);
        yPos += 100;
      });
      yPos += 40;
    }

    // Heatmap section
    const heatmapY = yPos + 40;
    const cellSize = 12;
    const cellGap = 3;
    const weekWidth = cellSize + cellGap;
    const heatmapWidth = weekWidth * 52;
    const heatmapX = (WIDTH - heatmapWidth) / 2;
    const heatmapHeight = (cellSize + cellGap) * 7;

    // Heatmap title - Strava style
    ctx.fillStyle = STRAVA_COLORS.accent;
    ctx.font = 'bold 44px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ACTIVITY HEATMAP', WIDTH / 2, heatmapY - 20);

    // Generate heatmap data for past year
    const todayForHeatmap = new Date();
    todayForHeatmap.setHours(0, 0, 0, 0);
    const counts = new Map<string, number>();
    activities.forEach((activity) => {
      const activityDate = new Date(activity.date);
      activityDate.setHours(0, 0, 0, 0);
      const dateKey = format(activityDate, 'yyyy-MM-dd');
      counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
    });

    const weeks: Date[][] = [];
    const startDate = subWeeks(todayForHeatmap, 51);
    const startWeek = startOfWeek(startDate, { weekStartsOn: 0 });

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

    // Draw heatmap - each week is a column, each day is a row
    weeks.forEach((week, weekIndex) => {
      week.forEach((day, dayIndex) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const count = counts.get(dateKey) || 0;
        const level = getActivityLevel(count);
        const isFuture = day > todayForHeatmap;

        const x = heatmapX + weekIndex * weekWidth;
        const y = heatmapY + dayIndex * (cellSize + cellGap);

        ctx.fillStyle = isFuture ? STRAVA_COLORS.level0 : STRAVA_COLORS[level];
        ctx.fillRect(x, y, cellSize, cellSize);
      });
    });

    // Add month legend below heatmap
    const legendY = heatmapY + heatmapHeight + 30;
    const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    
    // Calculate which week corresponds to the start of each month
    // We need to find months that fall within our 52-week range
    const monthPositions: Array<{ weekIndex: number; label: string }> = [];
    const currentYear = todayForHeatmap.getFullYear();
    
    // Check current year and previous year (since we go back 52 weeks)
    for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
      const year = currentYear - yearOffset;
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1);
        monthStart.setHours(0, 0, 0, 0);
        
        // Skip if month is in the future
        if (monthStart > todayForHeatmap) continue;
        
        // Find which week this month start falls in
        const daysSinceStart = Math.floor((monthStart.getTime() - startWeek.getTime()) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.floor(daysSinceStart / 7);
        
        // Only include if it's within our 52-week range
        if (weekIndex >= 0 && weekIndex < 52) {
          const labelIndex = month;
          // Avoid duplicates - only add if we don't already have this week
          if (!monthPositions.find(p => p.weekIndex === weekIndex)) {
            monthPositions.push({
              weekIndex,
              label: monthLabels[labelIndex]
            });
          }
        }
      }
    }
    
    // Sort by week index
    monthPositions.sort((a, b) => a.weekIndex - b.weekIndex);
    
    // Draw month labels at approximate positions
    ctx.fillStyle = STRAVA_COLORS.textSecondary;
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    
    // Draw labels, spacing them out if they're too close together
    let lastDrawnX = -100;
    monthPositions.forEach(({ weekIndex, label }) => {
      const x = heatmapX + weekIndex * weekWidth;
      // Only draw if it's not too close to the previous label (at least 30px apart)
      if (x - lastDrawnX >= 30 && x >= heatmapX - 10 && x <= heatmapX + heatmapWidth + 10) {
        ctx.fillText(label, x, legendY);
        lastDrawnX = x;
      }
    });

    // Footer - Strava style (below month legend)
    const footerY = Math.min(legendY + 40, HEIGHT - 50);
    ctx.fillStyle = STRAVA_COLORS.textSecondary;
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('strava-contributions.com', WIDTH / 2, footerY);

    // Convert to buffer
    const buffer = canvas.toBuffer('image/png');

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="fitness-wrapped.png"',
      },
    });
  } catch (error) {
    console.error('Error generating shareable graphic:', error);
    return NextResponse.json(
      { error: 'Failed to generate graphic' },
      { status: 500 }
    );
  }
}

