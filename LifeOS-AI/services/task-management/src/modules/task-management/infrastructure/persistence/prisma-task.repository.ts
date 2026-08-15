import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { Task } from '../../domain/task.aggregate';
import { TaskRepository, TaskFilter } from '../../domain/repositories/task.repository.port';
import { TaskMapper } from './task.mapper';

const withDeps = { dependencies: true } as const;

@Injectable()
export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(task: Task): Promise<void> {
    await this.persist(this.prisma, task);
  }

  async saveMany(tasks: Task[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const task of tasks) {
        await this.persist(tx, task);
      }
    });
  }

  async findById(userId: string, taskId: string): Promise<Task | null> {
    const record = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
      include: withDeps,
    });
    if (!record) return null;
    return TaskMapper.toDomain(record, record.dependencies.map((d) => d.prerequisiteId));
  }

  async findByUser(userId: string, filter: TaskFilter = {}): Promise<Task[]> {
    const where: Prisma.TaskWhereInput = { userId };
    if (filter.status) where.status = filter.status as any;
    if (filter.planId) where.planId = filter.planId;
    if (filter.from || filter.to) {
      where.suggestedStart = {};
      if (filter.from) (where.suggestedStart as Prisma.DateTimeFilter).gte = filter.from;
      if (filter.to) (where.suggestedStart as Prisma.DateTimeFilter).lte = filter.to;
    }

    const records = await this.prisma.task.findMany({
      where,
      include: withDeps,
      orderBy: [{ suggestedStart: 'asc' }, { importance: 'desc' }, { createdAt: 'asc' }],
    });
    return records.map((r) => TaskMapper.toDomain(r, r.dependencies.map((d) => d.prerequisiteId)));
  }

  async delete(userId: string, taskId: string): Promise<void> {
    await this.prisma.task.deleteMany({ where: { id: taskId, userId } });
  }

  /** Upserts the task row and reconciles its dependency edges. */
  private async persist(client: Prisma.TransactionClient | PrismaService, task: Task): Promise<void> {
    const data = TaskMapper.toPersistence(task);
    const { id, userId, ...mutable } = data;

    await client.task.upsert({
      where: { id },
      create: data,
      update: mutable,
    });

    // Reconcile dependency edges (idempotent).
    await client.taskDependency.deleteMany({ where: { dependentId: id } });
    const deps = task.snapshot.dependencyIds;
    if (deps.length > 0) {
      await client.taskDependency.createMany({
        data: deps.map((prerequisiteId) => ({ dependentId: id, prerequisiteId })),
        skipDuplicates: true,
      });
    }
  }
}
