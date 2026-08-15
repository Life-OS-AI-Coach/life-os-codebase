import { Task as PrismaTask } from '@prisma/client';
import { Task, TaskProps } from '../../domain/task.aggregate';
import { EisenhowerClassification } from '../../domain/value-objects/eisenhower.vo';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import {
  TaskStatus,
  TaskCategory,
  TaskSize,
  EisenhowerQuadrant,
} from '../../domain/enums';
import { TaskResponseDto } from '../../interface/dto/task-response.dto';

/**
 * Anti-corruption mapper between the persistence model (Prisma) and the domain
 * aggregate, plus projection of the aggregate to the API response DTO.
 */
export class TaskMapper {
  static toDomain(record: PrismaTask, dependencyIds: string[]): Task {
    const props: TaskProps = {
      id: record.id,
      userId: record.userId,
      planId: record.planId,
      title: record.title,
      description: record.description,
      category: record.category as unknown as TaskCategory,
      status: record.status as unknown as TaskStatus,
      size: record.size as unknown as TaskSize,
      classification: EisenhowerClassification.create(record.urgency, record.importance),
      estimatedMinutes: record.estimatedMinutes,
      slot:
        record.suggestedStart && record.suggestedEnd
          ? TimeSlot.create(record.suggestedStart, record.suggestedEnd)
          : null,
      deadline: record.deadline,
      completedAt: record.completedAt,
      dependencyIds,
      aiConfidence: record.aiConfidence,
      aiRecommendation: record.aiRecommendation,
      source: record.source,
      xpValue: record.xpValue,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return Task.rehydrate(props);
  }

  /** Column values for a Prisma create/update (dependencies handled separately). */
  static toPersistence(task: Task) {
    const p = task.snapshot;
    return {
      id: p.id,
      userId: p.userId,
      planId: p.planId,
      title: p.title,
      description: p.description,
      category: p.category as any,
      status: p.status as any,
      size: p.size as any,
      urgency: p.classification.urgency,
      importance: p.classification.importance,
      quadrant: p.classification.quadrant as any,
      estimatedMinutes: p.estimatedMinutes,
      suggestedStart: p.slot?.start ?? null,
      suggestedEnd: p.slot?.end ?? null,
      deadline: p.deadline,
      completedAt: p.completedAt,
      aiConfidence: p.aiConfidence,
      aiRecommendation: p.aiRecommendation,
      source: p.source,
      xpValue: p.xpValue,
    };
  }

  static toResponse(task: Task): TaskResponseDto {
    const p = task.snapshot;
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      status: p.status,
      size: p.size,
      urgency: p.classification.urgency,
      importance: p.classification.importance,
      quadrant: p.classification.quadrant as EisenhowerQuadrant,
      priorityScore: p.classification.priorityScore,
      estimatedMinutes: p.estimatedMinutes,
      suggestedStart: p.slot?.start.toISOString() ?? null,
      suggestedEnd: p.slot?.end.toISOString() ?? null,
      deadline: p.deadline?.toISOString() ?? null,
      completedAt: p.completedAt?.toISOString() ?? null,
      aiConfidence: p.aiConfidence,
      aiRecommendation: p.aiRecommendation,
      source: p.source,
      xpValue: p.xpValue,
      dependencyIds: p.dependencyIds,
      planId: p.planId,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
