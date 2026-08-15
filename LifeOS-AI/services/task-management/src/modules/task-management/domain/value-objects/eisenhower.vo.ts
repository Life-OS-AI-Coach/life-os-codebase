import { ValidationDomainError } from '../../../../common/errors/domain-error';
import { EisenhowerQuadrant } from '../enums';

/** Urgency/importance at or above this (0-100) counts as "high". */
export const EISENHOWER_THRESHOLD = 50;

/**
 * Value object encapsulating the Eisenhower prioritisation rule. Immutable:
 * constructed from urgency + importance scores; derives the quadrant and a
 * scalar priority score used for ordering.
 */
export class EisenhowerClassification {
  private constructor(
    public readonly urgency: number,
    public readonly importance: number,
    public readonly quadrant: EisenhowerQuadrant,
  ) {}

  static create(urgency: number, importance: number): EisenhowerClassification {
    for (const [label, v] of [
      ['urgency', urgency],
      ['importance', importance],
    ] as const) {
      if (!Number.isFinite(v) || v < 0 || v > 100) {
        throw new ValidationDomainError(`${label} must be a number between 0 and 100`);
      }
    }
    return new EisenhowerClassification(
      Math.round(urgency),
      Math.round(importance),
      EisenhowerClassification.classify(urgency, importance),
    );
  }

  private static classify(urgency: number, importance: number): EisenhowerQuadrant {
    const urgent = urgency >= EISENHOWER_THRESHOLD;
    const important = importance >= EISENHOWER_THRESHOLD;
    if (urgent && important) return EisenhowerQuadrant.URGENT_IMPORTANT;
    if (!urgent && important) return EisenhowerQuadrant.IMPORTANT_NOT_URGENT;
    if (urgent && !important) return EisenhowerQuadrant.URGENT_NOT_IMPORTANT;
    return EisenhowerQuadrant.NEITHER;
  }

  /**
   * Scalar priority (higher = do sooner). Importance is weighted slightly above
   * urgency to bias toward meaningful work over merely time-pressured work.
   */
  get priorityScore(): number {
    return Math.round(this.importance * 0.55 + this.urgency * 0.45);
  }
}
