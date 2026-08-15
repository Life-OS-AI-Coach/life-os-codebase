import { Injectable, Logger } from '@nestjs/common';
import { AiPlanner, PlannerContext, PlanResult, PlannedTaskDraft } from '../../application/ports/ai-planner.port';
import {
  splitIntoTasks,
  detectCategory,
  estimateDurationMinutes,
  sizeFromDuration,
  detectStartTime,
  detectPriority,
  resolvePlanDate,
  toTitle,
} from './nl-heuristics';
import { EisenhowerClassification } from '../../domain/value-objects/eisenhower.vo';
import { EisenhowerQuadrant } from '../../domain/enums';

/**
 * Zero-dependency planner. Turns a natural-language daily brief into structured
 * task drafts using deterministic heuristics. This is the default engine so the
 * product is fully functional with no external LLM or API key.
 */
@Injectable()
export class DeterministicPlanner implements AiPlanner {
  private readonly logger = new Logger(DeterministicPlanner.name);

  async plan(input: string, ctx: PlannerContext): Promise<PlanResult> {
    const planDate = resolvePlanDate(input, ctx.referenceDate);
    const phrases = splitIntoTasks(input);

    const tasks: PlannedTaskDraft[] = phrases.map((phrase) => {
      const start = detectStartTime(phrase, planDate);
      const estimatedMinutes = estimateDurationMinutes(phrase);
      const { urgency, importance } = detectPriority(phrase, start !== null);
      const end = start ? new Date(start.getTime() + estimatedMinutes * 60_000) : null;

      return {
        title: toTitle(phrase),
        description: null,
        category: detectCategory(phrase),
        size: sizeFromDuration(estimatedMinutes),
        estimatedMinutes,
        urgency,
        importance,
        suggestedStart: start,
        suggestedEnd: end,
        deadline: /\b(today|tonight|by end of day|eod)\b/i.test(phrase) ? endOfDay(planDate) : null,
        confidence: start ? 0.75 : 0.6,
        recommendation: this.recommendationFor(phrase, urgency, importance),
        dependsOn: [],
      };
    });

    this.logger.debug(`Deterministic planner produced ${tasks.length} task(s)`);

    return {
      summary: this.summarize(tasks),
      tasks,
      engine: 'deterministic',
    };
  }

  private recommendationFor(text: string, urgency: number, importance: number): string | null {
    const quadrant = EisenhowerClassification.create(urgency, importance).quadrant;
    switch (quadrant) {
      case EisenhowerQuadrant.URGENT_IMPORTANT:
        return 'Do this first — it is both urgent and important.';
      case EisenhowerQuadrant.IMPORTANT_NOT_URGENT:
        return 'Schedule dedicated focus time; this matters even if it is not pressing.';
      case EisenhowerQuadrant.URGENT_NOT_IMPORTANT:
        return 'Handle quickly or consider delegating.';
      default:
        return /\b(gym|walk|meditat|rest)\b/i.test(text)
          ? 'A good recovery activity — keep it if your energy allows.'
          : null;
    }
  }

  private summarize(tasks: PlannedTaskDraft[]): string {
    if (tasks.length === 0) return 'No actionable tasks were detected in the input.';
    const totalMin = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    const hours = Math.round((totalMin / 60) * 10) / 10;
    const anchored = tasks.filter((t) => t.suggestedStart).length;
    return `Planned ${tasks.length} task(s) totalling ~${hours}h of work, ${anchored} time-anchored.`;
  }
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 0, 0);
  return d;
}
