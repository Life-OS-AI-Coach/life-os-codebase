import { Task } from '../task.aggregate';
import { TaskStatus } from '../enums';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface TaskFilter {
  status?: TaskStatus;
  planId?: string;
  from?: Date;
  to?: Date;
}

/**
 * Repository port (hexagonal). The application layer depends only on this
 * abstraction; the Prisma adapter implements it in the infrastructure layer.
 */
export interface TaskRepository {
  save(task: Task): Promise<void>;
  saveMany(tasks: Task[]): Promise<void>;
  findById(userId: string, taskId: string): Promise<Task | null>;
  findByUser(userId: string, filter?: TaskFilter): Promise<Task[]>;
  delete(userId: string, taskId: string): Promise<void>;
}
