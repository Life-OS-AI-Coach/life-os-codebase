/**
 * Domain-level enumerations. These are intentionally decoupled from the
 * persistence (Prisma) enums; string values are kept identical so mappers are
 * trivial, but the domain never imports the ORM.
 */

export enum TaskStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  CANCELLED = 'CANCELLED',
}

export enum TaskCategory {
  WORK = 'WORK',
  HEALTH = 'HEALTH',
  PERSONAL = 'PERSONAL',
  ERRANDS = 'ERRANDS',
  LEARNING = 'LEARNING',
  SOCIAL = 'SOCIAL',
  FINANCE = 'FINANCE',
  OTHER = 'OTHER',
}

export enum EisenhowerQuadrant {
  URGENT_IMPORTANT = 'URGENT_IMPORTANT',
  IMPORTANT_NOT_URGENT = 'IMPORTANT_NOT_URGENT',
  URGENT_NOT_IMPORTANT = 'URGENT_NOT_IMPORTANT',
  NEITHER = 'NEITHER',
}

export enum TaskSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  CRITICAL = 'CRITICAL',
}

/** XP awarded on completion, keyed by task size (see Reward Engine spec). */
export const XP_BY_SIZE: Readonly<Record<TaskSize, number>> = {
  [TaskSize.SMALL]: 10,
  [TaskSize.MEDIUM]: 25,
  [TaskSize.LARGE]: 50,
  [TaskSize.CRITICAL]: 100,
};
