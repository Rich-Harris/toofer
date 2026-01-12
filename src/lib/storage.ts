import type { Account, EncryptedVault } from './types';
import { encrypt, decrypt } from './crypto';

const STORAGE_KEY = 'toofer_vault';

export function hasVault(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(STORAGE_KEY) !== null;
}

export async function saveVault(accounts: Account[], passphrase: string): Promise<void> {
	const data = JSON.stringify(accounts);
	const vault = await encrypt(data, passphrase);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
}

export async function loadVault(passphrase: string): Promise<Account[]> {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) {
		throw new Error('No vault found');
	}

	const vault: EncryptedVault = JSON.parse(stored);
	const decrypted = await decrypt(vault, passphrase);
	return JSON.parse(decrypted);
}

export function clearVault(): void {
	localStorage.removeItem(STORAGE_KEY);
}
