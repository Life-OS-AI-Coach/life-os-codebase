import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';

export interface UserSchedulingContext {
  workdayStart: string; // HH:mm
  workdayEnd: string; // HH:mm
  timezone: string;
  reminderLeadMin: number;
}

const DEFAULTS: UserSchedulingContext = {
  workdayStart: '09:00',
  workdayEnd: '18:00',
  timezone: 'UTC',
  reminderLeadMin: 15,
};

/** Read facade over user preferences used by planning/scheduling. */
@Injectable()
export class UserContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchedulingContext(userId: string): Promise<UserSchedulingContext> {
    const prefs = await this.prisma.userPreference.findUnique({ where: { userId } });
    if (!prefs) return DEFAULTS;
    return {
      workdayStart: prefs.workdayStart,
      workdayEnd: prefs.workdayEnd,
      timezone: prefs.timezone,
      reminderLeadMin: prefs.reminderLeadMin,
    };
  }
}
