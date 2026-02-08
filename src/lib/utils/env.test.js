import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock $app/environment since it's a SvelteKit virtual module
vi.mock('$app/environment', () => ({
	dev: true
}));

import { debugLog, errorLog, validateEnvironment } from './env.js';

describe('env utilities', () => {
	describe('debugLog', () => {
		it('should call console.log in dev mode', () => {
			const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

			debugLog('test message', { key: 'value' });

			expect(spy).toHaveBeenCalledWith('[DEBUG] test message', { key: 'value' });
			spy.mockRestore();
		});

		it('should handle undefined data parameter', () => {
			const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

			debugLog('test message');

			expect(spy).toHaveBeenCalledWith('[DEBUG] test message', undefined);
			spy.mockRestore();
		});
	});

	describe('errorLog', () => {
		it('should always call console.error', () => {
			const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const error = new Error('test error');

			errorLog('something failed', error);

			expect(spy).toHaveBeenCalledWith('[ERROR] something failed', error);
			spy.mockRestore();
		});
	});

	describe('validateEnvironment', () => {
		const originalEnv = process.env;

		beforeEach(() => {
			process.env = { ...originalEnv };
		});

		afterEach(() => {
			process.env = originalEnv;
		});

		it('should not throw when all required vars are present', () => {
			process.env.TEST_VAR_1 = 'value1';
			process.env.TEST_VAR_2 = 'value2';

			expect(() => validateEnvironment(['TEST_VAR_1', 'TEST_VAR_2'])).not.toThrow();
		});

		it('should throw when required vars are missing', () => {
			expect(() => validateEnvironment(['MISSING_VAR'])).toThrow(
				'Missing required environment variables: MISSING_VAR'
			);
		});

		it('should list all missing vars in the error message', () => {
			expect(() => validateEnvironment(['MISSING_A', 'MISSING_B'])).toThrow(
				'Missing required environment variables: MISSING_A, MISSING_B'
			);
		});

		it('should handle empty array of required vars', () => {
			expect(() => validateEnvironment([])).not.toThrow();
		});
	});
});
