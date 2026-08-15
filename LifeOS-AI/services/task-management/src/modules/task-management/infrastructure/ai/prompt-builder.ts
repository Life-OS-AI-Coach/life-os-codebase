import { PlannerContext } from '../../application/ports/ai-planner.port';
import { TaskCategory, TaskSize } from '../../domain/enums';

/**
 * Builds the system + user prompts for the LLM planner. The model is instructed
 * to return STRICT JSON matching the schema the response parser validates.
 */
export class PromptBuilder {
  static readonly RESPONSE_SCHEMA = {
    summary: 'string — one sentence overview of the day',
    tasks: [
      {
        title: 'string',
        description: 'string | null',
        category: Object.values(TaskCategory),
        size: Object.values(TaskSize),
        estimatedMinutes: 'integer > 0',
        urgency: 'integer 0-100',
        importance: 'integer 0-100',
        suggestedStart: 'ISO-8601 datetime | null',
        suggestedEnd: 'ISO-8601 datetime | null',
        deadline: 'ISO-8601 datetime | null',
        confidence: 'number 0-1',
        recommendation: 'string | null',
        dependsOn: 'array of task titles this task depends on',
      },
    ],
  };

  static system(): string {
    return [
      'You are the LifeOS AI daily planner.',
      'Extract discrete tasks from the user brief and produce a structured daily plan.',
      'For each task infer: category, size, estimated duration, urgency and importance',
      '(0-100 each, used for an Eisenhower matrix), a suggested start/end window,',
      'any deadline, a confidence score (0-1), a short encouraging recommendation, and',
      'dependencies by task title.',
      'Never shame the user. Always be encouraging and realistic about time.',
      'Respond with STRICT, MINIFIED JSON only — no markdown, no prose, no code fences.',
    ].join(' ');
  }

  static user(input: string, ctx: PlannerContext): string {
    return JSON.stringify({
      instruction: 'Return JSON exactly matching responseSchema. Resolve relative times against referenceDate.',
      referenceDate: ctx.referenceDate.toISOString(),
      workday: { start: ctx.workdayStart, end: ctx.workdayEnd, timezone: ctx.timezone },
      responseSchema: PromptBuilder.RESPONSE_SCHEMA,
      brief: input,
    });
  }
}
