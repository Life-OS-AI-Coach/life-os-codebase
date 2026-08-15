import { randomUUID } from 'crypto';
import { ValidationDomainError, DomainError } from '../../../common/errors/domain-error';
import { TaskStatus, TaskCategory, TaskSize, XP_BY_SIZE } from './enums';
import { EisenhowerClassification } from './value-objects/eisenhower.vo';
import { TimeSlot } from './value-objects/time-slot.vo';
import {
  DomainEvent,
  TaskCreatedEvent,
  TaskCompletedEvent,
  TaskMissedEvent,
  TaskRescheduledEvent,
} from './events/domain-event';

export interface TaskProps {
  id: string;
  userId: string;
  planId: string | null;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  size: TaskSize;
  classification: EisenhowerClassification;
  estimatedMinutes: number;
  slot: TimeSlot | null;
  deadline: Date | null;
  completedAt: Date | null;
  dependencyIds: string[];
  aiConfidence: number | null;
  aiRecommendation: string | null;
  source: string;
  xpValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string | null;
  category?: TaskCategory;
  size?: TaskSize;
  urgency?: number;
  importance?: number;
  estimatedMinutes: number;
  suggestedStart?: Date | null;
  suggestedEnd?: Date | null;
  deadline?: Date | null;
  dependencyIds?: string[];
  aiConfidence?: number | null;
  aiRecommendation?: string | null;
  source?: string;
  planId?: string | null;
}

/**
 * Task aggregate root. Owns all invariants for a unit of work: prioritisation
 * (Eisenhower), scheduling window, lifecycle transitions and reward accounting.
 * Raises domain events that the application layer projects onto motivation,
 * reminders, etc.
 */
export class Task {
  private readonly _events: DomainEvent[] = [];

  private constructor(private props: TaskProps) {}

  // -- Factories -------------------------------------------------------------

  static create(input: CreateTaskInput): Task {
    const title = input.title?.trim();
    if (!title) {
      throw new ValidationDomainError('Task title is required');
    }
    if (!Number.isFinite(input.estimatedMinutes) || input.estimatedMinutes <= 0) {
      throw new ValidationDomainError('estimatedMinutes must be a positive number');
    }

    const size = input.size ?? TaskSize.MEDIUM;
    const classification = EisenhowerClassification.create(
      input.urgency ?? 50,
      input.importance ?? 50,
    );
    const slot =
      input.suggestedStart && input.suggestedEnd
        ? TimeSlot.create(input.suggestedStart, input.suggestedEnd)
        : null;

    const now = new Date();
    const task = new Task({
      id: randomUUID(),
      userId: input.userId,
      planId: input.planId ?? null,
      title,
      description: input.description?.trim() || null,
      category: input.category ?? TaskCategory.OTHER,
      status: TaskStatus.PLANNED,
      size,
      classification,
      estimatedMinutes: Math.round(input.estimatedMinutes),
      slot,
      deadline: input.deadline ?? null,
      completedAt: null,
      dependencyIds: input.dependencyIds ?? [],
      aiConfidence: input.aiConfidence ?? null,
      aiRecommendation: input.aiRecommendation?.trim() || null,
      source: input.source ?? 'manual',
      xpValue: XP_BY_SIZE[size],
      createdAt: now,
      updatedAt: now,
    });
    task.record(new TaskCreatedEvent(task.id, task.userId, task.title));
    return task;
  }

  /** Reconstitute from persistence without raising events or re-validating history. */
  static rehydrate(props: TaskProps): Task {
    return new Task(props);
  }

  // -- Behaviour -------------------------------------------------------------

  complete(when: Date = new Date()): void {
    if (this.props.status === TaskStatus.COMPLETED) {
      throw new DomainError('Task is already completed');
    }
    if (this.props.status === TaskStatus.CANCELLED) {
      throw new DomainError('A cancelled task cannot be completed');
    }
    this.props.status = TaskStatus.COMPLETED;
    this.props.completedAt = when;
    this.touch();
    this.record(new TaskCompletedEvent(this.id, this.userId, this.props.xpValue));
  }

  markMissed(): void {
    if (this.props.status === TaskStatus.COMPLETED) {
      throw new DomainError('A completed task cannot be marked missed');
    }
    this.props.status = TaskStatus.MISSED;
    this.touch();
    this.record(new TaskMissedEvent(this.id, this.userId));
  }

  start(): void {
    if (this.props.status !== TaskStatus.PLANNED) {
      throw new DomainError('Only a planned task can be started');
    }
    this.props.status = TaskStatus.IN_PROGRESS;
    this.touch();
  }

  cancel(): void {
    if (this.props.status === TaskStatus.COMPLETED) {
      throw new DomainError('A completed task cannot be cancelled');
    }
    this.props.status = TaskStatus.CANCELLED;
    this.touch();
  }

  reschedule(start: Date, end: Date): void {
    if (this.props.status === TaskStatus.COMPLETED || this.props.status === TaskStatus.CANCELLED) {
      throw new DomainError('Only an active task can be rescheduled');
    }
    const slot = TimeSlot.create(start, end);
    this.props.slot = slot;
    if (this.props.status === TaskStatus.MISSED) {
      this.props.status = TaskStatus.PLANNED; // recovery: re-plan a missed task
    }
    this.touch();
    this.record(new TaskRescheduledEvent(this.id, this.userId, slot.start, slot.end));
  }

  updateDetails(changes: {
    title?: string;
    description?: string | null;
    category?: TaskCategory;
    size?: TaskSize;
    estimatedMinutes?: number;
    urgency?: number;
    importance?: number;
    deadline?: Date | null;
  }): void {
    if (changes.title !== undefined) {
      const t = changes.title.trim();
      if (!t) throw new ValidationDomainError('Task title cannot be empty');
      this.props.title = t;
    }
    if (changes.description !== undefined) {
      this.props.description = changes.description?.trim() || null;
    }
    if (changes.category !== undefined) this.props.category = changes.category;
    if (changes.size !== undefined) {
      this.props.size = changes.size;
      this.props.xpValue = XP_BY_SIZE[changes.size];
    }
    if (changes.estimatedMinutes !== undefined) {
      if (changes.estimatedMinutes <= 0) {
        throw new ValidationDomainError('estimatedMinutes must be positive');
      }
      this.props.estimatedMinutes = Math.round(changes.estimatedMinutes);
    }
    if (changes.urgency !== undefined || changes.importance !== undefined) {
      this.props.classification = EisenhowerClassification.create(
        changes.urgency ?? this.props.classification.urgency,
        changes.importance ?? this.props.classification.importance,
      );
    }
    if (changes.deadline !== undefined) this.props.deadline = changes.deadline;
    this.touch();
  }

  assignToPlan(planId: string): void {
    this.props.planId = planId;
    this.touch();
  }

  /** Replace the set of prerequisite task ids (self-references are ignored). */
  setDependencies(taskIds: string[]): void {
    this.props.dependencyIds = Array.from(new Set(taskIds)).filter((id) => id !== this.props.id);
    this.touch();
  }

  get title(): string {
    return this.props.title;
  }

  // -- Events ----------------------------------------------------------------

  private record(event: DomainEvent): void {
    this._events.push(event);
  }

  pullEvents(): DomainEvent[] {
    const events = [...this._events];
    this._events.length = 0;
    return events;
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  // -- Accessors -------------------------------------------------------------

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get priorityScore(): number {
    return this.props.classification.priorityScore;
  }
  get snapshot(): Readonly<TaskProps> {
    return this.props;
  }
}
