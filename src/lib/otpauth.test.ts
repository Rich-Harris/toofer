import { describe, it, expect } from 'vitest';
import {
	parseOTPAuthURI,
	otpAuthToAccount,
	isValidOTPAuthURI,
	accountToOTPAuthURI
} from './otpauth';

describe('otpauth', () => {
	describe('parseOTPAuthURI', () => {
		it('parses a basic TOTP URI', () => {
			const uri = 'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example';
			const result = parseOTPAuthURI(uri);

			expect(result.type).toBe('totp');
			expect(result.label).toBe('alice@example.com');
			expect(result.issuer).toBe('Example');
			expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
		});

		it('parses URI without issuer prefix in label', () => {
			const uri = 'otpauth://totp/alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example';
			const result = parseOTPAuthURI(uri);

			expect(result.label).toBe('alice@example.com');
			expect(result.issuer).toBe('Example');
		});

		it('uses issuer from query param over label prefix', () => {
			const uri = 'otpauth://totp/OldIssuer:alice?secret=JBSWY3DPEHPK3PXP&issuer=NewIssuer';
			const result = parseOTPAuthURI(uri);

			expect(result.issuer).toBe('NewIssuer');
		});

		it('extracts issuer from label if not in query params', () => {
			const uri = 'otpauth://totp/MyService:user@email.com?secret=JBSWY3DPEHPK3PXP';
			const result = parseOTPAuthURI(uri);

			expect(result.issuer).toBe('MyService');
			expect(result.label).toBe('user@email.com');
		});

		it('uses Unknown as default issuer', () => {
			const uri = 'otpauth://totp/user@email.com?secret=JBSWY3DPEHPK3PXP';
			const result = parseOTPAuthURI(uri);

			expect(result.issuer).toBe('Unknown');
		});

		it('normalizes secret to uppercase without spaces', () => {
			const uri = 'otpauth://totp/Test:user?secret=jbsw%20y3dp%20ehpk';
			const result = parseOTPAuthURI(uri);

			expect(result.secret).toBe('JBSWY3DPEHPK');
		});

		it('parses optional parameters', () => {
			const uri =
				'otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP&algorithm=SHA256&digits=8&period=60';
			const result = parseOTPAuthURI(uri);

			expect(result.algorithm).toBe('SHA256');
			expect(result.digits).toBe(8);
			expect(result.period).toBe(60);
		});

		it('parses HOTP URIs with counter', () => {
			const uri = 'otpauth://hotp/Test:user?secret=JBSWY3DPEHPK3PXP&counter=42';
			const result = parseOTPAuthURI(uri);

			expect(result.type).toBe('hotp');
			expect(result.counter).toBe(42);
		});

		it('handles URL-encoded characters in label', () => {
			const uri = 'otpauth://totp/My%20Service:user%40example.com?secret=JBSWY3DPEHPK3PXP';
			const result = parseOTPAuthURI(uri);

			expect(result.issuer).toBe('My Service');
			expect(result.label).toBe('user@example.com');
		});

		it('throws on invalid URI scheme', () => {
			expect(() => parseOTPAuthURI('http://example.com')).toThrow(
				'Invalid OTPAuth URI: must start with otpauth://'
			);
		});

		it('throws on invalid OTP type', () => {
			expect(() => parseOTPAuthURI('otpauth://invalid/Test?secret=ABC')).toThrow(
				'Invalid OTPAuth URI: type must be totp or hotp'
			);
		});

		it('throws on missing secret', () => {
			expect(() => parseOTPAuthURI('otpauth://totp/Test')).toThrow(
				'Invalid OTPAuth URI: missing secret parameter'
			);
		});
	});

	describe('isValidOTPAuthURI', () => {
		it('returns true for valid URIs', () => {
			expect(isValidOTPAuthURI('otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP')).toBe(true);
			expect(isValidOTPAuthURI('otpauth://hotp/Test?secret=JBSWY3DPEHPK3PXP&counter=0')).toBe(true);
		});

		it('returns false for invalid URIs', () => {
			expect(isValidOTPAuthURI('http://example.com')).toBe(false);
			expect(isValidOTPAuthURI('otpauth://totp/Test')).toBe(false);
			expect(isValidOTPAuthURI('not a uri')).toBe(false);
			expect(isValidOTPAuthURI('')).toBe(false);
		});
	});

	describe('otpAuthToAccount', () => {
		it('converts parsed OTPAuth to Account', () => {
			const parsed = parseOTPAuthURI(
				'otpauth://totp/GitHub:user@email.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub'
			);
			const account = otpAuthToAccount(parsed);

			expect(account.name).toBe('user@email.com');
			expect(account.issuer).toBe('GitHub');
			expect(account.secret).toBe('JBSWY3DPEHPK3PXP');
			expect(account.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			);
		});
	});

	describe('accountToOTPAuthURI', () => {
		it('converts Account to OTPAuth URI', () => {
			const account = {
				id: '123',
				name: 'user@email.com',
				issuer: 'GitHub',
				secret: 'JBSWY3DPEHPK3PXP'
			};
			const uri = accountToOTPAuthURI(account);

			expect(uri).toContain('otpauth://totp/');
			expect(uri).toContain('GitHub');
			expect(uri).toContain('user%40email.com');
			expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
			expect(uri).toContain('issuer=GitHub');
		});

		it('round-trips correctly', () => {
			const original = {
				id: '123',
				name: 'alice@example.com',
				issuer: 'Example',
				secret: 'JBSWY3DPEHPK3PXP'
			};

			const uri = accountToOTPAuthURI(original);
			const parsed = parseOTPAuthURI(uri);
			const restored = otpAuthToAccount(parsed);

			expect(restored.name).toBe(original.name);
			expect(restored.issuer).toBe(original.issuer);
			expect(restored.secret).toBe(original.secret);
		});
	});
});
