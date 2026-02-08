import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from './rateLimit.js';

describe('rateLimit', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('createRateLimiter', () => {
		it('should allow requests under the limit', () => {
			const limiter = createRateLimiter({ windowMs: 60000, max: 3 });
			const r1 = limiter.check('user1');
			expect(r1.allowed).toBe(true);
			expect(r1.remaining).toBe(2);
		});

		it('should block requests over the limit', () => {
			const limiter = createRateLimiter({ windowMs: 60000, max: 3 });
			limiter.check('user1');
			limiter.check('user1');
			limiter.check('user1');

			const r4 = limiter.check('user1');
			expect(r4.allowed).toBe(false);
			expect(r4.remaining).toBe(0);
			expect(r4.retryAfter).toBeGreaterThan(0);
		});

		it('should track keys independently', () => {
			const limiter = createRateLimiter({ windowMs: 60000, max: 2 });
			limiter.check('user1');
			limiter.check('user1');

			const r = limiter.check('user2');
			expect(r.allowed).toBe(true);
			expect(r.remaining).toBe(1);
		});

		it('should allow requests again after window expires', () => {
			const limiter = createRateLimiter({ windowMs: 60000, max: 2 });
			limiter.check('user1');
			limiter.check('user1');

			expect(limiter.check('user1').allowed).toBe(false);

			// Advance time past the window
			vi.advanceTimersByTime(61000);

			const r = limiter.check('user1');
			expect(r.allowed).toBe(true);
			expect(r.remaining).toBe(1);
		});

		it('should use sliding window (partial expiry)', () => {
			const limiter = createRateLimiter({ windowMs: 60000, max: 2 });

			limiter.check('user1'); // t=0
			vi.advanceTimersByTime(30000); // t=30s
			limiter.check('user1'); // t=30s

			// At t=30s, both requests are within window
			expect(limiter.check('user1').allowed).toBe(false);

			// At t=61s, first request has expired but second hasn't
			vi.advanceTimersByTime(31000);
			const r = limiter.check('user1');
			expect(r.allowed).toBe(true);
			expect(r.remaining).toBe(0); // used 1 (unexpired) + 1 (new) = 2 of 2
		});

		it('should provide correct retryAfter value', () => {
			const limiter = createRateLimiter({ windowMs: 60000, max: 1 });
			limiter.check('user1'); // t=0

			vi.advanceTimersByTime(10000); // t=10s
			const r = limiter.check('user1');
			expect(r.allowed).toBe(false);
			expect(r.retryAfter).toBe(50); // 60 - 10 = 50 seconds
		});

		it('should reset a key', () => {
			const limiter = createRateLimiter({ windowMs: 60000, max: 1 });
			limiter.check('user1');
			expect(limiter.check('user1').allowed).toBe(false);

			limiter.reset('user1');
			expect(limiter.check('user1').allowed).toBe(true);
		});

		it('should return remaining count correctly', () => {
			const limiter = createRateLimiter({ windowMs: 60000, max: 5 });
			expect(limiter.check('user1').remaining).toBe(4);
			expect(limiter.check('user1').remaining).toBe(3);
			expect(limiter.check('user1').remaining).toBe(2);
			expect(limiter.check('user1').remaining).toBe(1);
			expect(limiter.check('user1').remaining).toBe(0);
			expect(limiter.check('user1').allowed).toBe(false);
		});
	});
});
