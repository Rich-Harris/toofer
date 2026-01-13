import type { Account } from '$lib/types';

// Simple reactive store for accounts state shared across routes
let accounts = $state<Account[]>([]);
let passphrase = $state('');
let unlocked = $state(false);
let showSettings = $state(false);

export function getAccounts() {
	return accounts;
}

export function setAccounts(newAccounts: Account[]) {
	accounts = newAccounts;
}

export function getPassphrase() {
	return passphrase;
}

export function setPassphrase(newPassphrase: string) {
	passphrase = newPassphrase;
}

export function isUnlocked() {
	return unlocked;
}

export function setUnlocked(value: boolean) {
	unlocked = value;
	console.log({ unlocked });
}

export function getAccountById(id: string): Account | undefined {
	return accounts.find((a) => a.id === id);
}

export function updateAccount(id: string, updates: Partial<Account>) {
	const index = accounts.findIndex((a) => a.id === id);
	if (index !== -1) {
		accounts[index] = { ...accounts[index], ...updates };
	}
}

export function deleteAccount(id: string) {
	accounts = accounts.filter((a) => a.id !== id);
}

export function lock() {
	accounts = [];
	passphrase = '';
	unlocked = false;
	showSettings = false;
}

export function isShowingSettings() {
	return showSettings;
}

export function toggleSettings() {
	showSettings = !showSettings;
}
