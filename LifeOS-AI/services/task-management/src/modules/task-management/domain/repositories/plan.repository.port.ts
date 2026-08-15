export const PLAN_REPOSITORY = Symbol('PLAN_REPOSITORY');

export interface DailyPlanRecord {
  id: string;
  userId: string;
  planDate: Date;
  rawInput: string;
  summary: string | null;
  hasConflicts: boolean;
  conflictNotes: string | null;
  createdAt: Date;
}

export interface CreatePlanInput {
  userId: string;
  planDate: Date;
  rawInput: string;
  summary: string | null;
  hasConflicts: boolean;
  conflictNotes: string | null;
}

/** Persistence port for the DailyPlan read/write model. */
export interface PlanRepository {
  create(input: CreatePlanInput): Promise<DailyPlanRecord>;
  findById(userId: string, planId: string): Promise<DailyPlanRecord | null>;
}
