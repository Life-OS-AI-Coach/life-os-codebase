import { Injectable, Logger } from '@nestjs/common';
import { MotivationEventType } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const XP_PER_LEVEL = 100;

export interface MotivationSnapshot {
  totalXp: number;
  level: number;
  motivationScore: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Application service owning the gamification read model. Projects task
 * lifecycle events (completed / missed) onto XP, level, motivation score and
 * streaks. Penalties never shame — they only nudge the score.
 */
@Injectable()
export class MotivationService {
  private readonly logger = new Logger(MotivationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot(userId: string): Promise<MotivationSnapshot> {
    const state = await this.ensureState(userId);
    return {
      totalXp: state.totalXp,
      level: state.level,
      motivationScore: state.motivationScore,
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
    };
  }

  async onTaskCompleted(userId: string, xp: number): Promise<void> {
    const state = await this.ensureState(userId);
    const today = startOfUtcDay(new Date());

    let currentStreak = state.currentStreak;
    if (!state.lastActiveDate) {
      currentStreak = 1;
    } else {
      const last = startOfUtcDay(state.lastActiveDate);
      const diffDays = Math.round((today.getTime() - last.getTime()) / 86_400_000);
      if (diffDays === 0) {
        currentStreak = Math.max(1, currentStreak); // already active today
      } else if (diffDays === 1) {
        currentStreak += 1; // consecutive day
      } else {
        currentStreak = 1; // streak lapsed
      }
    }

    const totalXp = state.totalXp + xp;
    const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
    const motivationScore = clamp(state.motivationScore + 4);
    const longestStreak = Math.max(state.longestStreak, currentStreak);

    await this.prisma.$transaction([
      this.prisma.motivationState.update({
        where: { userId },
        data: { totalXp, level, motivationScore, currentStreak, longestStreak, lastActiveDate: today },
      }),
      this.prisma.motivationEvent.create({
        data: {
          userId,
          type: MotivationEventType.TASK_COMPLETED,
          xpDelta: xp,
          scoreDelta: motivationScore - state.motivationScore,
          reason: `Completed a task (+${xp} XP)`,
        },
      }),
    ]);
    this.logger.debug(`User ${userId} completed task: +${xp}xp, streak ${currentStreak}`);
  }

  async onTaskMissed(userId: string): Promise<void> {
    const state = await this.ensureState(userId);
    const motivationScore = clamp(state.motivationScore - 5);

    await this.prisma.$transaction([
      this.prisma.motivationState.update({
        where: { userId },
        data: { motivationScore, currentStreak: 0 },
      }),
      this.prisma.motivationEvent.create({
        data: {
          userId,
          type: MotivationEventType.TASK_MISSED,
          xpDelta: 0,
          scoreDelta: motivationScore - state.motivationScore,
          reason: 'A task was missed — recovery suggested',
        },
      }),
    ]);
  }

  private async ensureState(userId: string) {
    return this.prisma.motivationState.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
