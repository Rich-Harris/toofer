import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './crypto';

describe('crypto', () => {
	describe('encrypt/decrypt', () => {
		it('round-trips simple data', async () => {
			const data = 'Hello, World!';
			const passphrase = 'test-passphrase';

			const encrypted = await encrypt(data, passphrase);
			const decrypted = await decrypt(encrypted, passphrase);

			expect(decrypted).toBe(data);
		});

		it('round-trips JSON data', async () => {
			const data = JSON.stringify({
				accounts: [
					{ id: '1', name: 'alice', issuer: 'GitHub', secret: 'ABC123' },
					{ id: '2', name: 'bob', issuer: 'Google', secret: 'DEF456' }
				]
			});
			const passphrase = 'secure-passphrase-123';

			const encrypted = await encrypt(data, passphrase);
			const decrypted = await decrypt(encrypted, passphrase);

			expect(decrypted).toBe(data);
			expect(JSON.parse(decrypted)).toEqual(JSON.parse(data));
		});

		it('produces different ciphertext for same data', async () => {
			const data = 'Same data';
			const passphrase = 'same-passphrase';

			const encrypted1 = await encrypt(data, passphrase);
			const encrypted2 = await encrypt(data, passphrase);

			// Different salt and IV should produce different ciphertext
			expect(encrypted1.data).not.toBe(encrypted2.data);
			expect(encrypted1.salt).not.toBe(encrypted2.salt);
			expect(encrypted1.iv).not.toBe(encrypted2.iv);

			// But both should decrypt to same data
			expect(await decrypt(encrypted1, passphrase)).toBe(data);
			expect(await decrypt(encrypted2, passphrase)).toBe(data);
		});

		it('fails with wrong passphrase', async () => {
			const data = 'Secret data';
			const encrypted = await encrypt(data, 'correct-passphrase');

			await expect(decrypt(encrypted, 'wrong-passphrase')).rejects.toThrow();
		});

		it('handles empty string', async () => {
			const data = '';
			const passphrase = 'test';

			const encrypted = await encrypt(data, passphrase);
			const decrypted = await decrypt(encrypted, passphrase);

			expect(decrypted).toBe('');
		});

		it('handles unicode characters', async () => {
			const data = '你好世界 🌍 Привет мир';
			const passphrase = 'unicode-test';

			const encrypted = await encrypt(data, passphrase);
			const decrypted = await decrypt(encrypted, passphrase);

			expect(decrypted).toBe(data);
		});

		it('handles long data', async () => {
			const data = 'x'.repeat(10000);
			const passphrase = 'long-data-test';

			const encrypted = await encrypt(data, passphrase);
			const decrypted = await decrypt(encrypted, passphrase);

			expect(decrypted).toBe(data);
			expect(decrypted.length).toBe(10000);
		});
	});

	describe('encrypted vault structure', () => {
		it('returns object with required fields', async () => {
			const encrypted = await encrypt('test', 'pass');

			expect(encrypted).toHaveProperty('iv');
			expect(encrypted).toHaveProperty('data');
			expect(encrypted).toHaveProperty('salt');
		});

		it('returns base64-encoded strings', async () => {
			const encrypted = await encrypt('test', 'pass');

			// Base64 strings should only contain these characters
			const base64Regex = /^[A-Za-z0-9+/]+=*$/;
			expect(encrypted.iv).toMatch(base64Regex);
			expect(encrypted.data).toMatch(base64Regex);
			expect(encrypted.salt).toMatch(base64Regex);
		});
	});
});
