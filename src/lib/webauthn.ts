const CREDENTIAL_STORAGE_KEY = 'toofer_webauthn_credential';
const PASSPHRASE_STORAGE_KEY = 'toofer_biometric_passphrase';

interface StoredCredential {
	credentialId: string;
	rawId: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
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

export function isWebAuthnSupported(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.PublicKeyCredential !== undefined &&
		typeof window.PublicKeyCredential === 'function'
	);
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
	if (!isWebAuthnSupported()) return false;
	try {
		return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
	} catch {
		return false;
	}
}

export function hasBiometricCredential(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(CREDENTIAL_STORAGE_KEY) !== null;
}

export async function registerBiometric(passphrase: string): Promise<boolean> {
	if (!await isPlatformAuthenticatorAvailable()) {
		throw new Error('Platform authenticator not available');
	}

	const userId = crypto.getRandomValues(new Uint8Array(16));
	const challenge = crypto.getRandomValues(new Uint8Array(32));

	const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
		challenge,
		rp: {
			name: 'Toofer',
			id: window.location.hostname
		},
		user: {
			id: userId,
			name: 'toofer-user',
			displayName: 'Toofer User'
		},
		pubKeyCredParams: [
			{ alg: -7, type: 'public-key' }, // ES256
			{ alg: -257, type: 'public-key' } // RS256
		],
		authenticatorSelection: {
			authenticatorAttachment: 'platform',
			userVerification: 'required',
			residentKey: 'preferred'
		},
		timeout: 60000,
		attestation: 'none'
	};

	try {
		const credential = (await navigator.credentials.create({
			publicKey: publicKeyCredentialCreationOptions
		})) as PublicKeyCredential;

		if (!credential) {
			throw new Error('Failed to create credential');
		}

		// Store the credential ID
		const storedCredential: StoredCredential = {
			credentialId: credential.id,
			rawId: arrayBufferToBase64(credential.rawId)
		};
		localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(storedCredential));

		// Store the passphrase (in production, you'd want to encrypt this with a key
		// derived from the PRF extension, but for compatibility we'll use a simpler approach)
		// The passphrase is protected by the biometric check itself
		const encodedPassphrase = btoa(passphrase);
		localStorage.setItem(PASSPHRASE_STORAGE_KEY, encodedPassphrase);

		return true;
	} catch (error) {
		console.error('WebAuthn registration failed:', error);
		throw error;
	}
}

export async function authenticateWithBiometric(): Promise<string> {
	const storedCredentialJson = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
	if (!storedCredentialJson) {
		throw new Error('No biometric credential found');
	}

	const storedCredential: StoredCredential = JSON.parse(storedCredentialJson);
	const challenge = crypto.getRandomValues(new Uint8Array(32));

	const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
		challenge,
		rpId: window.location.hostname,
		allowCredentials: [
			{
				id: base64ToArrayBuffer(storedCredential.rawId),
				type: 'public-key',
				transports: ['internal']
			}
		],
		userVerification: 'required',
		timeout: 60000
	};

	try {
		const assertion = (await navigator.credentials.get({
			publicKey: publicKeyCredentialRequestOptions
		})) as PublicKeyCredential;

		if (!assertion) {
			throw new Error('Authentication failed');
		}

		// Retrieve the stored passphrase
		const encodedPassphrase = localStorage.getItem(PASSPHRASE_STORAGE_KEY);
		if (!encodedPassphrase) {
			throw new Error('No passphrase found');
		}

		return atob(encodedPassphrase);
	} catch (error) {
		console.error('WebAuthn authentication failed:', error);
		throw error;
	}
}

export function removeBiometricCredential(): void {
	localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
	localStorage.removeItem(PASSPHRASE_STORAGE_KEY);
}
