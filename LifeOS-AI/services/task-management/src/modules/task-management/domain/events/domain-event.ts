/** Base type for all domain events raised by aggregates. */
export abstract class DomainEvent {
  readonly occurredAt: Date = new Date();
  abstract readonly name: string;
}

export class TaskCreatedEvent extends DomainEvent {
  readonly name = 'TaskCreated';
  constructor(
    public readonly taskId: string,
    public readonly userId: string,
    public readonly title: string,
  ) {
    super();
  }
}

export class TaskCompletedEvent extends DomainEvent {
  readonly name = 'TaskCompleted';
  constructor(
    public readonly taskId: string,
    public readonly userId: string,
    public readonly xpAwarded: number,
  ) {
    super();
  }
}

export class TaskMissedEvent extends DomainEvent {
  readonly name = 'TaskMissed';
  constructor(
    public readonly taskId: string,
    public readonly userId: string,
  ) {
    super();
  }
}

export class TaskRescheduledEvent extends DomainEvent {
  readonly name = 'TaskRescheduled';
  constructor(
    public readonly taskId: string,
    public readonly userId: string,
    public readonly newStart: Date,
    public readonly newEnd: Date,
  ) {
    super();
  }
}
