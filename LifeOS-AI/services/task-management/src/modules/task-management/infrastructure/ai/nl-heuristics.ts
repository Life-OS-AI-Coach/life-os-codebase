import { TaskCategory, TaskSize } from '../../domain/enums';

/**
 * Deterministic natural-language heuristics shared by the offline planner and
 * used as a safety net for LLM output. Pure functions, no IO.
 */

const BULLET = /^[\s]*[-*•·o]\s+/i;
const NUMBERED = /^[\s]*\d+[.)]\s+/;

/** Break a free-form daily brief into candidate task phrases. */
export function splitIntoTasks(input: string): string[] {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.replace(BULLET, '').replace(NUMBERED, '').trim())
    .filter(Boolean);

  const phrases: string[] = [];
  for (const line of lines) {
    // A single line may pack several tasks separated by commas / "and" / "then".
    const parts = line
      .split(/,|\bthen\b|\band\b|;/i)
      .map((p) => p.trim())
      .filter((p) => p.length > 1);
    phrases.push(...(parts.length ? parts : [line]));
  }
  // Drop leading scaffolding like "Tomorrow I have".
  return phrases
    .map((p) => p.replace(/^(tomorrow|today|i have|i need to|i want to|i should)\b[:\s]*/i, '').trim())
    .filter((p) => p.length > 1);
}

const CATEGORY_KEYWORDS: Array<[TaskCategory, RegExp]> = [
  [TaskCategory.HEALTH, /\b(gym|run|jog|walk|workout|exercise|meditat|yoga|doctor|dentist|sleep|nap)\b/i],
  [TaskCategory.WORK, /\b(meeting|client|presentation|report|email|standup|deploy|review|deadline|project|call|interview)\b/i],
  [TaskCategory.ERRANDS, /\b(pick up|buy|grocery|groceries|pharmacy|medicine|medicines|shop|shopping|bank|post)\b/i],
  [TaskCategory.LEARNING, /\b(study|read|course|learn|practice|revise|exam|homework|assignment)\b/i],
  [TaskCategory.SOCIAL, /\b(dinner|lunch|coffee|party|friend|family|birthday|catch up|meet)\b/i],
  [TaskCategory.FINANCE, /\b(pay|bill|invoice|budget|tax|taxes|transfer)\b/i],
];

export function detectCategory(text: string): TaskCategory {
  for (const [category, re] of CATEGORY_KEYWORDS) {
    if (re.test(text)) return category;
  }
  return TaskCategory.PERSONAL;
}

const DURATION_KEYWORDS: Array<[RegExp, number]> = [
  [/\b(presentation|report|project|deep work|study|write|design)\b/i, 120],
  [/\b(meeting|gym|workout|interview|class|course|lunch|dinner)\b/i, 60],
  [/\b(call|standup|review|email|meditat|walk)\b/i, 30],
  [/\b(pick up|buy|grocery|pharmacy|medicine|medicines|pay|bill)\b/i, 20],
];

/** Explicit "for N minutes/hours" wins over keyword defaults. */
export function estimateDurationMinutes(text: string): number {
  const explicit = text.match(/\bfor\s+(\d+(?:\.\d+)?)\s*(min|mins|minutes|hour|hours|hr|hrs)\b/i);
  if (explicit) {
    const value = parseFloat(explicit[1]);
    const unit = explicit[2].toLowerCase();
    return Math.round(unit.startsWith('h') || unit.startsWith('hr') ? value * 60 : value);
  }
  for (const [re, minutes] of DURATION_KEYWORDS) {
    if (re.test(text)) return minutes;
  }
  return 30;
}

export function sizeFromDuration(minutes: number): TaskSize {
  if (minutes <= 20) return TaskSize.SMALL;
  if (minutes <= 60) return TaskSize.MEDIUM;
  if (minutes <= 120) return TaskSize.LARGE;
  return TaskSize.CRITICAL;
}

const PERIOD_HOURS: Record<string, number> = {
  morning: 9,
  noon: 12,
  afternoon: 14,
  evening: 18,
  night: 20,
};

/**
 * Resolve a start time from a phrase relative to `base` (date-only).
 * Returns null when no time is expressed.
 */
export function detectStartTime(text: string, base: Date): Date | null {
  const clock = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (clock) {
    let hour = parseInt(clock[1], 10) % 12;
    const minutes = clock[2] ? parseInt(clock[2], 10) : 0;
    if (/pm/i.test(clock[3])) hour += 12;
    const d = new Date(base);
    d.setUTCHours(hour, minutes, 0, 0);
    return d;
  }
  for (const [period, hour] of Object.entries(PERIOD_HOURS)) {
    if (new RegExp(`\\b${period}\\b`, 'i').test(text)) {
      const d = new Date(base);
      d.setUTCHours(hour, 0, 0, 0);
      return d;
    }
  }
  return null;
}

export interface PriorityScores {
  urgency: number;
  importance: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function detectPriority(text: string, isTimeAnchored: boolean): PriorityScores {
  let urgency = 45;
  let importance = 45;

  if (isTimeAnchored) urgency += 20;
  if (/\b(urgent|asap|immediately|now|right away)\b/i.test(text)) urgency += 35;
  if (/\b(deadline|due|today|by\s+\d)\b/i.test(text)) urgency += 20;
  if (/\b(important|critical|priority|client|interview|exam|boss)\b/i.test(text)) importance += 35;
  if (/\b(presentation|report|project|meeting)\b/i.test(text)) importance += 20;
  if (/\b(gym|meditat|walk|health|sleep|family|self)\b/i.test(text)) importance += 15;

  return { urgency: clamp(urgency), importance: clamp(importance) };
}

/** Derive the plan's reference date, shifting by one day when "tomorrow" appears. */
export function resolvePlanDate(input: string, referenceDate: Date): Date {
  const d = new Date(referenceDate);
  d.setUTCHours(0, 0, 0, 0);
  if (/\btomorrow\b/i.test(input)) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

/** Title-case a phrase and trim trailing time fragments for a clean task title. */
export function toTitle(phrase: string): string {
  const cleaned = phrase
    .replace(/\b(at|by|around|from)\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/i, '')
    .replace(/\b(in the\s+)?(morning|afternoon|evening|night|noon)\b/i, '')
    .replace(/\bfor\s+\d+\s*(min|mins|minutes|hour|hours|hr|hrs)\b/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const base = cleaned || phrase;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
