/**
 * Transport-agnostic domain errors. The domain and application layers throw
 * these; the HTTP layer maps them to status codes via DomainExceptionFilter.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Aggregate/entity not found. Maps to HTTP 404. */
export class NotFoundDomainError extends DomainError {}

/** Invariant / value-object validation failure. Maps to HTTP 422. */
export class ValidationDomainError extends DomainError {}

/** Business-rule conflict (e.g. schedule clash acknowledged). Maps to HTTP 400. */
export class ConflictDomainError extends DomainError {}
