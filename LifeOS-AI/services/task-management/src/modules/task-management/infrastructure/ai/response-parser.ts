import { PlannedTaskDraft, PlanResult } from '../../application/ports/ai-planner.port';
import { TaskCategory, TaskSize } from '../../domain/enums';
import { sizeFromDuration } from './nl-heuristics';

/** Thrown when the LLM output cannot be coerced into a valid plan. */
export class PlannerParseError extends Error {}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function coerceEnum<T extends Record<string, string>>(value: unknown, e: T, fallback: T[keyof T]): T[keyof T] {
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    const match = Object.values(e).find((v) => v === upper);
    if (match) return match as T[keyof T];
  }
  return fallback;
}

function coerceDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Validates and normalises raw LLM JSON into a strongly-typed PlanResult.
 * Structural validation is strict (must contain a tasks array); per-field
 * validation is defensive — bad values are coerced to safe defaults rather
 * than failing the whole plan.
 */
export class ResponseParser {
  static parse(raw: string): PlanResult {
    const json = ResponseParser.extractJson(raw);

    if (!json || typeof json !== 'object' || !Array.isArray((json as any).tasks)) {
      throw new PlannerParseError('LLM response did not contain a tasks array');
    }

    const tasks: PlannedTaskDraft[] = (json as any).tasks
      .map((t: any): PlannedTaskDraft | null => {
        const title = typeof t?.title === 'string' ? t.title.trim() : '';
        if (!title) return null;

        const estimatedMinutes =
          Number.isFinite(t?.estimatedMinutes) && t.estimatedMinutes > 0
            ? Math.round(t.estimatedMinutes)
            : 30;

        const start = coerceDate(t?.suggestedStart);
        let end = coerceDate(t?.suggestedEnd);
        if (start && !end) end = new Date(start.getTime() + estimatedMinutes * 60_000);
        if (start && end && end.getTime() <= start.getTime()) {
          end = new Date(start.getTime() + estimatedMinutes * 60_000);
        }

        return {
          title,
          description: typeof t?.description === 'string' ? t.description.trim() || null : null,
          category: coerceEnum(t?.category, TaskCategory, TaskCategory.OTHER),
          size: coerceEnum(t?.size, TaskSize, sizeFromDuration(estimatedMinutes)),
          estimatedMinutes,
          urgency: clamp(Math.round(Number(t?.urgency) || 50), 0, 100),
          importance: clamp(Math.round(Number(t?.importance) || 50), 0, 100),
          suggestedStart: start,
          suggestedEnd: start ? end : null,
          deadline: coerceDate(t?.deadline),
          confidence: clamp(Number(t?.confidence) || 0.7, 0, 1),
          recommendation:
            typeof t?.recommendation === 'string' ? t.recommendation.trim() || null : null,
          dependsOn: Array.isArray(t?.dependsOn)
            ? t.dependsOn.filter((d: unknown) => typeof d === 'string')
            : [],
        };
      })
      .filter((t: PlannedTaskDraft | null): t is PlannedTaskDraft => t !== null);

    if (tasks.length === 0) {
      throw new PlannerParseError('LLM response produced no valid tasks');
    }

    const summary =
      typeof (json as any).summary === 'string' && (json as any).summary.trim()
        ? (json as any).summary.trim()
        : `Planned ${tasks.length} task(s).`;

    return { summary, tasks, engine: 'anthropic' };
  }

  /** Tolerates code fences / surrounding prose by extracting the outermost JSON object. */
  private static extractJson(raw: string): unknown {
    const trimmed = raw.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(trimmed.slice(start, end + 1));
        } catch {
          /* fall through */
        }
      }
      throw new PlannerParseError('Could not parse JSON from LLM response');
    }
  }
}
