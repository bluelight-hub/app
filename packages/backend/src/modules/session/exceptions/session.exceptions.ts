import { HttpException, HttpStatus } from '@nestjs/common';

export class SessionNotFoundException extends HttpException {
  constructor(sessionId: string) {
    super(`Session with ID ${sessionId} not found`, HttpStatus.NOT_FOUND);
  }
}

export class SessionExpiredException extends HttpException {
  constructor(sessionId: string) {
    super(`Session ${sessionId} has expired`, HttpStatus.UNAUTHORIZED);
  }
}

export class SessionRevokedException extends HttpException {
  constructor(sessionId: string, reason?: string) {
    super(
      `Session ${sessionId} has been revoked${reason ? `: ${reason}` : ''}`,
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class SessionLimitExceededException extends HttpException {
  constructor(userId: string, limit: number) {
    super(
      `User ${userId} has exceeded the maximum session limit of ${limit}`,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InvalidSessionException extends HttpException {
  constructor(reason: string) {
    super(`Invalid session: ${reason}`, HttpStatus.BAD_REQUEST);
  }
}

export class SessionRiskDetectedException extends HttpException {
  constructor(sessionId: string, riskScore: number, factors: string[]) {
    super(
      {
        message: `High risk detected for session ${sessionId}`,
        riskScore,
        factors,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class SessionActivityException extends HttpException {
  constructor(message: string) {
    super(`Session activity error: ${message}`, HttpStatus.BAD_REQUEST);
  }
}
