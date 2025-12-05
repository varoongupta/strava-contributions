import OpenAI from 'openai';
import type { TrainingWeek } from './race-planner';
import { buildTrainingPlanPrompt } from './llm-prompt-builder';
import type { PromptContext } from './llm-prompt-builder';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export async function generatePlanWithLLM(context: PromptContext): Promise<TrainingWeek[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const prompt = buildTrainingPlanPrompt(context);

  const systemMessage = `You are an elite running coach with over 30 years of experience. You create personalized, scientifically-sound training plans that balance challenge with safety. You always follow best practices for periodization, progression, and injury prevention.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7, // Balance between creativity and consistency
      max_tokens: 8000, // Increased for full training plans
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean the content - remove any markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    cleanedContent = cleanedContent.trim();

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (parseError: any) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('Content length:', cleanedContent.length);
      console.error('Content preview (first 500 chars):', cleanedContent.substring(0, 500));
      console.error('Content preview (last 500 chars):', cleanedContent.substring(Math.max(0, cleanedContent.length - 500)));
      // Try to find and log the problematic area
      const errorPosition = parseError.message.match(/position (\d+)/)?.[1];
      if (errorPosition) {
        const pos = parseInt(errorPosition);
        const start = Math.max(0, pos - 100);
        const end = Math.min(cleanedContent.length, pos + 100);
        console.error('Content around error position:', cleanedContent.substring(start, end));
      }
      throw new Error(`Invalid JSON response from LLM: ${parseError.message}`);
    }
    
    // Handle wrapped object (JSON mode requires object, not array)
    let weeks: TrainingWeek[];
    if (parsed.weeks && Array.isArray(parsed.weeks)) {
      weeks = parsed.weeks;
    } else if (parsed.plan && Array.isArray(parsed.plan)) {
      weeks = parsed.plan;
    } else if (Array.isArray(parsed)) {
      weeks = parsed;
    } else {
      throw new Error(`Unexpected response format from LLM: ${JSON.stringify(parsed).substring(0, 200)}`);
    }

    // Convert date strings to Date objects
    weeks = weeks.map(week => ({
      ...week,
      startDate: new Date(week.startDate),
      endDate: new Date(week.endDate),
      workouts: week.workouts.map(workout => ({
        ...workout,
        date: new Date(workout.date),
      })),
    }));

    return weeks;
  } catch (error: any) {
    console.error('Error generating plan with LLM:', error);
    if (error.response) {
      console.error('OpenAI API Error:', error.response.status, error.response.data);
    }
    throw new Error(`Failed to generate training plan: ${error.message || 'Unknown error'}`);
  }
}

