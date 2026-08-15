import { Inject, Injectable, Logger } from '@nestjs/common';
import { Task } from '../../domain/task.aggregate';
import { NotFoundDomainError } from '../../../../common/errors/domain-error';
import { TaskCategory, TaskSize } from '../../domain/enums';
import { EisenhowerClassification } from '../../domain/value-objects/eisenhower.vo';
import { SchedulingService, SchedulableItem } from '../../domain/services/scheduling.service';
import {
  TASK_REPOSITORY,
  TaskRepository,
} from '../../domain/repositories/task.repository.port';
import {
  PLAN_REPOSITORY,
  PlanRepository,
} from '../../domain/repositories/plan.repository.port';
import { AI_PLANNER, AiPlanner } from '../ports/ai-planner.port';
import { UserContextService } from './user-context.service';
import { ReminderService } from './reminder.service';
import { MotivationService } from './motivation.service';
import {
  TaskCompletedEvent,
  TaskMissedEvent,
} from '../../domain/events/domain-event';

export interface PlanExecutionResult {
  planId: string | null;
  summary: string;
  engine: string;
  conflicts: string[];
  tasks: Task[];
}

export interface CreateTaskInputDto {
  title: string;
  description?: string;
  category?: TaskCategory;
  size?: TaskSize;
  estimatedMinutes: number;
  urgency?: number;
  importance?: number;
  suggestedStart?: string;
  suggestedEnd?: string;
  deadline?: string;
  dependencyIds?: string[];
}

/**
 * Command side (CQRS write model) for the Task Management domain. Orchestrates
 * the AI planner, scheduling domain service, persistence and cross-aggregate
 * projections (reminders, motivation) — while all invariants live in the Task
 * aggregate itself.
 */
@Injectable()
export class TaskCommandService {
  private readonly logger = new Logger(TaskCommandService.name);

  constructor(
    @Inject(AI_PLANNER) private readonly planner: AiPlanner,
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    private readonly scheduling: SchedulingService,
    private readonly userContext: UserContextService,
    private readonly reminders: ReminderService,
    private readonly motivation: MotivationService,
  ) {}

  // -- AI planning -----------------------------------------------------------

  async planDay(userId: string, input: string, persist = true): Promise<PlanExecutionResult> {
    const ctx = await this.userContext.getSchedulingContext(userId);
    const referenceDate = new Date();

    const plan = await this.planner.plan(input, {
      referenceDate,
      workdayStart: ctx.workdayStart,
      workdayEnd: ctx.workdayEnd,
      timezone: ctx.timezone,
    });

    const planDate = this.derivePlanDate(plan.tasks.map((t) => t.suggestedStart), referenceDate);
    const [workStart, workEnd] = this.workdayWindow(planDate, ctx.workdayStart, ctx.workdayEnd);

    // Fill schedule gaps for tasks the planner did not time-anchor.
    const items: SchedulableItem[] = plan.tasks.map((t, i) => ({
      ref: String(i),
      title: t.title,
      estimatedMinutes: t.estimatedMinutes,
      priorityScore: EisenhowerClassification.create(t.urgency, t.importance).priorityScore,
      fixedStart: t.suggestedStart,
      fixedEnd: t.suggestedEnd,
    }));
    const { assignments, conflicts } = this.scheduling.schedule(items, workStart, workEnd);
    const slotByRef = new Map(assignments.map((a) => [a.ref, a]));

    // Build aggregates.
    const aggregates = plan.tasks.map((draft, i) => {
      const slot = slotByRef.get(String(i));
      return Task.create({
        userId,
        title: draft.title,
        description: draft.description,
        category: draft.category,
        size: draft.size,
        urgency: draft.urgency,
        importance: draft.importance,
        estimatedMinutes: draft.estimatedMinutes,
        suggestedStart: slot?.start ?? draft.suggestedStart ?? null,
        suggestedEnd: slot?.end ?? draft.suggestedEnd ?? null,
        deadline: draft.deadline,
        aiConfidence: draft.confidence,
        aiRecommendation: draft.recommendation,
        source: 'ai_planner',
      });
    });

    // Resolve dependency titles -> ids within this batch.
    const idByTitle = new Map(aggregates.map((t) => [t.title.toLowerCase(), t.id]));
    plan.tasks.forEach((draft, i) => {
      const depIds = draft.dependsOn
        .map((title) => idByTitle.get(title.toLowerCase()))
        .filter((id): id is string => Boolean(id));
      if (depIds.length) aggregates[i].setDependencies(depIds);
    });

    let planId: string | null = null;
    if (persist) {
      const record = await this.plans.create({
        userId,
        planDate,
        rawInput: input,
        summary: plan.summary,
        hasConflicts: conflicts.length > 0,
        conflictNotes: conflicts.length ? conflicts.join(' ') : null,
      });
      planId = record.id;
      aggregates.forEach((t) => t.assignToPlan(planId!));
      await this.tasks.saveMany(aggregates);
      await Promise.all(aggregates.map((t) => this.reminders.scheduleForTask(t, ctx.reminderLeadMin)));
      aggregates.forEach((t) => t.pullEvents()); // drain TaskCreated events (logged/observed elsewhere)
      this.logger.log(`Persisted plan ${planId} with ${aggregates.length} task(s) via ${plan.engine}`);
    }

    return { planId, summary: plan.summary, engine: plan.engine, conflicts, tasks: aggregates };
  }

  // -- CRUD / lifecycle ------------------------------------------------------

  async create(userId: string, dto: CreateTaskInputDto): Promise<Task> {
    const task = Task.create({
      userId,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      size: dto.size,
      urgency: dto.urgency,
      importance: dto.importance,
      estimatedMinutes: dto.estimatedMinutes,
      suggestedStart: dto.suggestedStart ? new Date(dto.suggestedStart) : null,
      suggestedEnd: dto.suggestedEnd ? new Date(dto.suggestedEnd) : null,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      dependencyIds: dto.dependencyIds,
      source: 'manual',
    });
    await this.tasks.save(task);
    const ctx = await this.userContext.getSchedulingContext(userId);
    await this.reminders.scheduleForTask(task, ctx.reminderLeadMin);
    task.pullEvents();
    return task;
  }

  async update(
    userId: string,
    taskId: string,
    changes: {
      title?: string;
      description?: string;
      category?: TaskCategory;
      size?: TaskSize;
      estimatedMinutes?: number;
      urgency?: number;
      importance?: number;
      deadline?: string;
    },
  ): Promise<Task> {
    const task = await this.require(userId, taskId);
    task.updateDetails({
      ...changes,
      deadline: changes.deadline === undefined ? undefined : changes.deadline ? new Date(changes.deadline) : null,
    });
    await this.tasks.save(task);
    return task;
  }

  async complete(userId: string, taskId: string): Promise<Task> {
    const task = await this.require(userId, taskId);
    task.complete();
    await this.tasks.save(task);
    await this.dispatch(task);
    return task;
  }

  async miss(userId: string, taskId: string): Promise<Task> {
    const task = await this.require(userId, taskId);
    task.markMissed();
    await this.tasks.save(task);
    await this.dispatch(task);
    return task;
  }

  async reschedule(userId: string, taskId: string, start: string, end: string): Promise<Task> {
    const task = await this.require(userId, taskId);
    task.reschedule(new Date(start), new Date(end));
    await this.tasks.save(task);
    const ctx = await this.userContext.getSchedulingContext(userId);
    await this.reminders.scheduleForTask(task, ctx.reminderLeadMin);
    task.pullEvents();
    return task;
  }

  async remove(userId: string, taskId: string): Promise<void> {
    await this.require(userId, taskId);
    await this.tasks.delete(userId, taskId);
  }

  // -- helpers ---------------------------------------------------------------

  private async require(userId: string, taskId: string): Promise<Task> {
    const task = await this.tasks.findById(userId, taskId);
    if (!task) throw new NotFoundDomainError(`Task ${taskId} not found`);
    return task;
  }

  /** Project domain events raised by a mutation onto the motivation read model. */
  private async dispatch(task: Task): Promise<void> {
    for (const event of task.pullEvents()) {
      if (event instanceof TaskCompletedEvent) {
        await this.motivation.onTaskCompleted(event.userId, event.xpAwarded);
      } else if (event instanceof TaskMissedEvent) {
        await this.motivation.onTaskMissed(event.userId);
      }
    }
  }

  private derivePlanDate(starts: Array<Date | null>, fallback: Date): Date {
    const anchored = starts.find((s): s is Date => s instanceof Date);
    const base = anchored ?? fallback;
    const d = new Date(base);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private workdayWindow(planDate: Date, start: string, end: string): [Date, Date] {
    const [sh, sm] = start.split(':').map((n) => parseInt(n, 10));
    const [eh, em] = end.split(':').map((n) => parseInt(n, 10));
    const s = new Date(planDate);
    s.setUTCHours(sh || 9, sm || 0, 0, 0);
    const e = new Date(planDate);
    e.setUTCHours(eh || 18, em || 0, 0, 0);
    return [s, e];
  }
}
