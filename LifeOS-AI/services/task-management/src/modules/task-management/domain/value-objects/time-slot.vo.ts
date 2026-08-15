import { ValidationDomainError } from '../../../../common/errors/domain-error';

/**
 * Value object representing a scheduled time window. Immutable and framework
 * agnostic. Supports overlap detection used by the scheduling domain service.
 */
export class TimeSlot {
  private constructor(
    public readonly start: Date,
    public readonly end: Date,
  ) {}

  static create(start: Date, end: Date): TimeSlot {
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      throw new ValidationDomainError('TimeSlot start is not a valid date');
    }
    if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
      throw new ValidationDomainError('TimeSlot end is not a valid date');
    }
    if (end.getTime() <= start.getTime()) {
      throw new ValidationDomainError('TimeSlot end must be after start');
    }
    return new TimeSlot(start, end);
  }

  get durationMinutes(): number {
    return Math.round((this.end.getTime() - this.start.getTime()) / 60_000);
  }

  /** True when this slot and `other` share any instant (touching edges do not count). */
  overlaps(other: TimeSlot): boolean {
    return this.start.getTime() < other.end.getTime() && other.start.getTime() < this.end.getTime();
  }
}
