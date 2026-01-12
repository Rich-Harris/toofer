import type { EncryptedVault } from './types';

const ITERATIONS = 100000;
const KEY_LENGTH = 256;

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer as ArrayBuffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const passphraseKey = await crypto.subtle.importKey(
		'raw',
		encoder.encode(passphrase),
		'PBKDF2',
		false,
		['deriveKey']
	);

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: salt.buffer as ArrayBuffer,
			iterations: ITERATIONS,
			hash: 'SHA-256'
		},
		passphraseKey,
		{ name: 'AES-GCM', length: KEY_LENGTH },
		false,
		['encrypt', 'decrypt']
	);
}

export async function encrypt(data: string, passphrase: string): Promise<EncryptedVault> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(passphrase, salt);

	const encoder = new TextEncoder();
	const encrypted = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		encoder.encode(data)
	);

	return {
		iv: arrayBufferToBase64(iv),
		data: arrayBufferToBase64(encrypted),
		salt: arrayBufferToBase64(salt)
	};
}

export async function decrypt(vault: EncryptedVault, passphrase: string): Promise<string> {
	const salt = new Uint8Array(base64ToArrayBuffer(vault.salt));
	const iv = new Uint8Array(base64ToArrayBuffer(vault.iv));
	const encryptedData = base64ToArrayBuffer(vault.data);

	const key = await deriveKey(passphrase, salt);

	const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedData);

	const decoder = new TextDecoder();
	return decoder.decode(decrypted);
}
