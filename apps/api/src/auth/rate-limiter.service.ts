import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RateLimiterService {
  // Map of normalized email -> array of failed attempt timestamps (ms)
  private readonly attempts = new Map<string, number[]>();
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_ATTEMPTS = 5;

  checkLimit(email: string): void {
    const normalized = email.toLowerCase().trim();
    const now = Date.now();
    const timestamps = this.attempts.get(normalized) || [];

    // Filter out attempts older than window
    const recent = timestamps.filter((t) => now - t < this.WINDOW_MS);
    this.attempts.set(normalized, recent);

    if (recent.length >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many login attempts. Please try again in 15 minutes.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(email: string): void {
    const normalized = email.toLowerCase().trim();
    const now = Date.now();
    const timestamps = this.attempts.get(normalized) || [];
    const recent = timestamps.filter((t) => now - t < this.WINDOW_MS);
    recent.push(now);
    this.attempts.set(normalized, recent);
  }

  reset(email: string): void {
    const normalized = email.toLowerCase().trim();
    this.attempts.delete(normalized);
  }
}
