import { Injectable } from '@nestjs/common';
import { ReminderChannel } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { Task } from '../../domain/task.aggregate';

/**
 * Schedules in-app reminders for time-anchored tasks. In Phase 1 reminders are
 * persisted as SCHEDULED rows (a future BullMQ worker will dispatch them);
 * surfacing them is enough for the dashboard "upcoming" view.
 */
@Injectable()
export class ReminderService {
  constructor(private readonly prisma: PrismaService) {}

  async scheduleForTask(task: Task, leadMinutes: number): Promise<void> {
    const slot = task.snapshot.slot;
    if (!slot) return;

    const remindAt = new Date(slot.start.getTime() - leadMinutes * 60_000);
    await this.prisma.reminder.create({
      data: {
        taskId: task.id,
        remindAt,
        channel: ReminderChannel.IN_APP,
        message: `Reminder: "${task.snapshot.title}" starts soon.`,
      },
    });
  }
}
