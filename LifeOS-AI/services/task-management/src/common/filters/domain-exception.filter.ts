import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError, NotFoundDomainError, ValidationDomainError } from '../errors/domain-error';

/**
 * Translates domain-layer errors (which are transport-agnostic) into HTTP
 * responses, keeping the domain free of framework/HTTP concerns.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message ?? message;
      error = (exception.constructor as any).name;
    } else if (exception instanceof NotFoundDomainError) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
      error = exception.name;
    } else if (exception instanceof ValidationDomainError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      message = exception.message;
      error = exception.name;
    } else if (exception instanceof DomainError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      error = exception.name;
    }

    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
