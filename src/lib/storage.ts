import type { Account, EncryptedVault, VaultInfo } from './types';
import { encrypt, decrypt } from './crypto';

const VAULTS_INDEX_KEY = 'toofer_vaults';
const VAULT_PREFIX = 'toofer_vault_';

export function getVaultList(): VaultInfo[] {
	if (typeof localStorage === 'undefined') return [];
	const stored = localStorage.getItem(VAULTS_INDEX_KEY);
	if (!stored) return [];
	try {
		return JSON.parse(stored);
	} catch {
		return [];
	}
}

function saveVaultList(vaults: VaultInfo[]): void {
	localStorage.setItem(VAULTS_INDEX_KEY, JSON.stringify(vaults));
}

export function hasVault(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return getVaultList().length > 0;
}

export async function createVault(name: string, accounts: Account[], passphrase: string): Promise<string> {
	const id = crypto.randomUUID();
	const vaultInfo: VaultInfo = {
		id,
		name,
		createdAt: Date.now()
	};

	// Save vault data
	const data = JSON.stringify(accounts);
	const encrypted = await encrypt(data, passphrase);
	localStorage.setItem(VAULT_PREFIX + id, JSON.stringify(encrypted));

	// Update vault index
	const vaults = getVaultList();
	vaults.push(vaultInfo);
	saveVaultList(vaults);

	return id;
}

export async function saveVault(vaultId: string, accounts: Account[], passphrase: string): Promise<void> {
	const data = JSON.stringify(accounts);
	const vault = await encrypt(data, passphrase);
	localStorage.setItem(VAULT_PREFIX + vaultId, JSON.stringify(vault));
}

export async function loadVault(vaultId: string, passphrase: string): Promise<Account[]> {
	const stored = localStorage.getItem(VAULT_PREFIX + vaultId);
	if (!stored) {
		throw new Error('Vault not found');
	}

	const vault: EncryptedVault = JSON.parse(stored);
	const decrypted = await decrypt(vault, passphrase);
	return JSON.parse(decrypted);
}

export function deleteVault(vaultId: string): void {
	// Remove vault data
	localStorage.removeItem(VAULT_PREFIX + vaultId);

	// Update vault index
	const vaults = getVaultList();
	const updated = vaults.filter((v) => v.id !== vaultId);
	saveVaultList(updated);
}

export function renameVault(vaultId: string, newName: string): void {
	const vaults = getVaultList();
	const vault = vaults.find((v) => v.id === vaultId);
	if (vault) {
		vault.name = newName;
		saveVaultList(vaults);
	}
}

export function getVaultInfo(vaultId: string): VaultInfo | undefined {
	const vaults = getVaultList();
	return vaults.find((v) => v.id === vaultId);
}

export function clearVault(): void {
	const vaults = getVaultList();
	for (const vault of vaults) {
		localStorage.removeItem(VAULT_PREFIX + vault.id);
	}
	localStorage.removeItem(VAULTS_INDEX_KEY);
}
