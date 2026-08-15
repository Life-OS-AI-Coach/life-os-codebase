import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  PlanRepository,
  CreatePlanInput,
  DailyPlanRecord,
} from '../../domain/repositories/plan.repository.port';

@Injectable()
export class PrismaPlanRepository implements PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePlanInput): Promise<DailyPlanRecord> {
    const record = await this.prisma.dailyPlan.create({ data: input });
    return this.toRecord(record);
  }

  async findById(userId: string, planId: string): Promise<DailyPlanRecord | null> {
    const record = await this.prisma.dailyPlan.findFirst({ where: { id: planId, userId } });
    return record ? this.toRecord(record) : null;
  }

  private toRecord(r: {
    id: string;
    userId: string;
    planDate: Date;
    rawInput: string;
    summary: string | null;
    hasConflicts: boolean;
    conflictNotes: string | null;
    createdAt: Date;
  }): DailyPlanRecord {
    return {
      id: r.id,
      userId: r.userId,
      planDate: r.planDate,
      rawInput: r.rawInput,
      summary: r.summary,
      hasConflicts: r.hasConflicts,
      conflictNotes: r.conflictNotes,
      createdAt: r.createdAt,
    };
  }
}
