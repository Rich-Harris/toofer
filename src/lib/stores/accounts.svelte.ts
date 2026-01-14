import type { Account } from '$lib/types';

/** Settings state - UI-related state that isn't vault-specific */
export const settings = new (class Settings {
	open = $state(false);

	toggle() {
		this.open = !this.open;
	}
})();

/** Vault state - the currently unlocked vault and its contents */
export const vault = new (class Vault {
	accounts = $state<Account[]>([]);
	passphrase = $state('');
	unlocked = $state(false);
	currentId = $state('');

	getAccountById(id: string): Account | undefined {
		return this.accounts.find((a) => a.id === id);
	}

	updateAccount(id: string, updates: Partial<Account>) {
		const index = this.accounts.findIndex((a) => a.id === id);
		if (index !== -1) {
			this.accounts[index] = { ...this.accounts[index], ...updates };
		}
	}

	deleteAccount(id: string) {
		this.accounts = this.accounts.filter((a) => a.id !== id);
	}

	lock() {
		this.accounts = [];
		this.passphrase = '';
		this.unlocked = false;
		this.currentId = '';
		settings.open = false;
	}
})();
