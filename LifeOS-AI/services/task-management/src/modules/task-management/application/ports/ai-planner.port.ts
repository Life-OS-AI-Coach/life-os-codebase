import { TaskCategory, TaskSize } from '../../domain/enums';

export const AI_PLANNER = Symbol('AI_PLANNER');

/** Context handed to the planner so it can resolve relative times ("tomorrow"). */
export interface PlannerContext {
  referenceDate: Date; // "now" for the request (UTC)
  workdayStart: string; // "HH:mm"
  workdayEnd: string; // "HH:mm"
  timezone: string;
}

/** A single task proposed by the planner, prior to persistence. */
export interface PlannedTaskDraft {
  title: string;
  description: string | null;
  category: TaskCategory;
  size: TaskSize;
  estimatedMinutes: number;
  urgency: number; // 0-100
  importance: number; // 0-100
  suggestedStart: Date | null;
  suggestedEnd: Date | null;
  deadline: Date | null;
  confidence: number; // 0-1
  recommendation: string | null;
  /** Titles of other drafts this task depends on (resolved to ids on persist). */
  dependsOn: string[];
}

export interface PlanResult {
  summary: string;
  tasks: PlannedTaskDraft[];
  /** Which engine produced the plan — surfaced to the client for transparency. */
  engine: 'deterministic' | 'anthropic';
}

/** Port implemented by concrete planners (deterministic fallback or LLM). */
export interface AiPlanner {
  plan(input: string, ctx: PlannerContext): Promise<PlanResult>;
}
