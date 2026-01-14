import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTOTP, getTimeRemaining, getProgress } from './totp';

describe('totp', () => {
	describe('generateTOTP', () => {
		it('generates a 6-digit code by default', async () => {
			const code = await generateTOTP('JBSWY3DPEHPK3PXP');
			expect(code).toMatch(/^\d{6}$/);
		});

		it('generates codes with specified digit length', async () => {
			const code = await generateTOTP('JBSWY3DPEHPK3PXP', 30, 8);
			expect(code).toMatch(/^\d{8}$/);
		});

		it('pads codes with leading zeros when needed', async () => {
			// The code should always be the specified length
			const code = await generateTOTP('JBSWY3DPEHPK3PXP');
			expect(code.length).toBe(6);
		});

		it('handles secrets with spaces and lowercase', async () => {
			// These should produce the same result
			const code1 = await generateTOTP('JBSWY3DPEHPK3PXP');
			const code2 = await generateTOTP('jbsw y3dp ehpk 3pxp');
			expect(code1).toBe(code2);
		});

		it('generates different codes for different secrets', async () => {
			const code1 = await generateTOTP('JBSWY3DPEHPK3PXP');
			const code2 = await generateTOTP('HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ');
			// Statistically very unlikely to be equal
			expect(code1).not.toBe(code2);
		});
	});

	describe('getTimeRemaining', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('returns seconds until next period', () => {
			// Set time to 10 seconds into a 30-second period
			vi.setSystemTime(new Date(10000));
			expect(getTimeRemaining(30)).toBe(20);
		});

		it('returns full period at start of period', () => {
			vi.setSystemTime(new Date(0));
			expect(getTimeRemaining(30)).toBe(30);
		});

		it('returns 1 second at end of period', () => {
			vi.setSystemTime(new Date(29000));
			expect(getTimeRemaining(30)).toBe(1);
		});

		it('handles custom time steps', () => {
			vi.setSystemTime(new Date(50000));
			expect(getTimeRemaining(60)).toBe(10);
		});
	});

	describe('getProgress', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('returns 1 at start of period', () => {
			vi.setSystemTime(new Date(0));
			expect(getProgress(30)).toBeCloseTo(1, 2);
		});

		it('returns approximately 0.5 at middle of period', () => {
			vi.setSystemTime(new Date(15000));
			expect(getProgress(30)).toBeCloseTo(0.5, 2);
		});

		it('returns close to 0 at end of period', () => {
			vi.setSystemTime(new Date(29500));
			expect(getProgress(30)).toBeCloseTo(0.017, 1);
		});

		it('handles custom time steps', () => {
			vi.setSystemTime(new Date(30000));
			expect(getProgress(60)).toBeCloseTo(0.5, 2);
		});
	});
});
