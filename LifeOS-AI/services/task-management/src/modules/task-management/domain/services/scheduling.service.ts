import { Injectable } from '@nestjs/common';
import { TimeSlot } from '../value-objects/time-slot.vo';

export interface SchedulableItem {
  ref: string; // caller-owned reference (e.g. temp id)
  title: string;
  estimatedMinutes: number;
  priorityScore: number;
  /** Fixed window if the item is time-anchored (e.g. a meeting "at 10 AM"). */
  fixedStart?: Date | null;
  fixedEnd?: Date | null;
}

export interface ScheduleAssignment {
  ref: string;
  start: Date;
  end: Date;
  anchored: boolean;
}

export interface ScheduleResult {
  assignments: ScheduleAssignment[];
  conflicts: string[];
}

const BUFFER_MINUTES = 10;

/**
 * Pure scheduling domain service. Places floating tasks into the free space of
 * a workday around time-anchored tasks, ordering by priority, and reports any
 * conflicts (overlapping anchors or work spilling past the workday).
 *
 * Stateless & deterministic — no framework or IO dependencies (the @Injectable
 * marker only allows DI registration; the logic remains pure).
 */
@Injectable()
export class SchedulingService {
  schedule(items: SchedulableItem[], workdayStart: Date, workdayEnd: Date): ScheduleResult {
    const conflicts: string[] = [];
    const assignments: ScheduleAssignment[] = [];

    const anchored = items
      .filter((i) => i.fixedStart && i.fixedEnd)
      .map((i) => ({ item: i, slot: TimeSlot.create(i.fixedStart!, i.fixedEnd!) }))
      .sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime());

    // Detect overlaps between anchored tasks.
    for (let i = 0; i < anchored.length; i++) {
      for (let j = i + 1; j < anchored.length; j++) {
        if (anchored[i].slot.overlaps(anchored[j].slot)) {
          conflicts.push(
            `"${anchored[i].item.title}" overlaps with "${anchored[j].item.title}".`,
          );
        }
      }
      assignments.push({
        ref: anchored[i].item.ref,
        start: anchored[i].slot.start,
        end: anchored[i].slot.end,
        anchored: true,
      });
    }

    // Occupied windows (from anchors) that floating tasks must avoid.
    const occupied = anchored.map((a) => a.slot).sort((x, y) => x.start.getTime() - y.start.getTime());

    const floating = items
      .filter((i) => !(i.fixedStart && i.fixedEnd))
      .sort((a, b) => b.priorityScore - a.priorityScore);

    let cursor = new Date(workdayStart);
    for (const item of floating) {
      const durationMs = item.estimatedMinutes * 60_000;
      let placed = false;

      // Advance the cursor until a gap of the required size is found.
      // Bounded iterations to stay strictly terminating.
      for (let guard = 0; guard < occupied.length + 2 && !placed; guard++) {
        const candidateEnd = new Date(cursor.getTime() + durationMs);
        const candidate = TimeSlot.create(cursor, candidateEnd);
        const clash = occupied.find((o) => candidate.overlaps(o));
        if (clash) {
          // Jump past the clashing anchor plus a buffer, then retry.
          cursor = new Date(clash.end.getTime() + BUFFER_MINUTES * 60_000);
          continue;
        }
        assignments.push({ ref: item.ref, start: candidate.start, end: candidate.end, anchored: false });
        cursor = new Date(candidate.end.getTime() + BUFFER_MINUTES * 60_000);
        placed = true;
        if (candidate.end.getTime() > workdayEnd.getTime()) {
          conflicts.push(`"${item.title}" is scheduled past your workday end.`);
        }
      }

      if (!placed) {
        // Fallback: append at the cursor even if it overflows the day.
        const end = new Date(cursor.getTime() + durationMs);
        assignments.push({ ref: item.ref, start: new Date(cursor), end, anchored: false });
        conflicts.push(`Could not find a free slot for "${item.title}"; appended to end of day.`);
        cursor = new Date(end.getTime() + BUFFER_MINUTES * 60_000);
      }
    }

    return { assignments, conflicts };
  }
}
