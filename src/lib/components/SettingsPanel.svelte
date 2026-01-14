<script lang="ts">
	import type { Account } from '$lib/types';
	import {
		isPlatformAuthenticatorAvailable,
		hasBiometricCredential,
		registerBiometric,
		removeBiometricCredential
	} from '$lib/webauthn';
	import { parseOTPAuthURI, otpAuthToAccount, isValidOTPAuthURI, accountToOTPAuthURI } from '$lib/otpauth';
	import { saveVault, deleteVault, getVaultInfo, renameVault } from '$lib/storage';
	import { vault, settings } from '$lib/stores/accounts.svelte';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import Upload from '@lucide/svelte/icons/upload';
	import Download from '@lucide/svelte/icons/download';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let vaultName = $derived(getVaultInfo(vault.currentId)?.name ?? 'Vault');

	let biometricAvailable = $state(false);
	let biometricEnabled = $state(false);
	let settingsMessage = $state('');
	let settingsLoading = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();
	let importLoading = $state(false);
	let showDeleteVaultConfirm = $state(false);
	let isEditingVaultName = $state(false);
	let editedVaultName = $state('');

	$effect(() => {
		checkBiometricStatus();
	});

	async function checkBiometricStatus() {
		biometricAvailable = await isPlatformAuthenticatorAvailable();
		biometricEnabled = hasBiometricCredential();
	}

	async function toggleBiometric() {
		settingsMessage = '';
		settingsLoading = true;

		try {
			if (biometricEnabled) {
				removeBiometricCredential();
				biometricEnabled = false;
				settingsMessage = 'Biometric login disabled';
			} else {
				await registerBiometric(vault.passphrase);
				biometricEnabled = true;
				settingsMessage = 'Biometric login enabled!';
			}
		} catch (err) {
			settingsMessage = 'Failed to update biometric settings';
		} finally {
			settingsLoading = false;
		}
	}

	function triggerImport() {
		fileInput?.click();
	}

	async function handleFileImport(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		importLoading = true;
		settingsMessage = '';

		try {
			const text = await file.text();
			const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
			const importedAccounts: Account[] = [];
			let failedCount = 0;

			for (const line of lines) {
				if (isValidOTPAuthURI(line)) {
					try {
						const parsed = parseOTPAuthURI(line);
						importedAccounts.push(otpAuthToAccount(parsed));
					} catch {
						failedCount++;
					}
				} else {
					failedCount++;
				}
			}

			if (importedAccounts.length > 0) {
				const existingSecrets = new Set(vault.accounts.map((a) => a.secret));
				const uniqueNewAccounts: Account[] = [];
				let duplicates = 0;

				for (const account of importedAccounts) {
					if (existingSecrets.has(account.secret)) {
						duplicates++;
					} else {
						existingSecrets.add(account.secret);
						uniqueNewAccounts.push(account);
					}
				}

				if (uniqueNewAccounts.length > 0) {
					const updated = [...vault.accounts, ...uniqueNewAccounts];
					await saveVault(vault.currentId, updated, vault.passphrase);
					vault.accounts = updated;
				}

				const parts: string[] = [];
				if (uniqueNewAccounts.length > 0) {
					parts.push(`Imported ${uniqueNewAccounts.length} account${uniqueNewAccounts.length === 1 ? '' : 's'}`);
				}
				if (duplicates > 0) {
					parts.push(`${duplicates} duplicate${duplicates === 1 ? '' : 's'} skipped`);
				}
				if (failedCount > 0) {
					parts.push(`${failedCount} failed`);
				}
				settingsMessage = parts.length > 0 ? parts.join(', ') : 'No new accounts added';
			} else {
				settingsMessage = 'No valid accounts found in file';
			}
		} catch {
			settingsMessage = 'Failed to read file';
		} finally {
			importLoading = false;
			input.value = '';
		}
	}

	function handleExport() {
		if (vault.accounts.length === 0) {
			settingsMessage = 'No accounts to export';
			return;
		}

		const lines = vault.accounts.map((account) => accountToOTPAuthURI(account));
		const content = lines.join('\n');
		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);

		const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
		const filename = `toofer_export_${timestamp}.txt`;

		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();

		URL.revokeObjectURL(url);
		settingsMessage = `Exported ${vault.accounts.length} account${vault.accounts.length === 1 ? '' : 's'}`;
	}

	function startEditingVaultName() {
		editedVaultName = vaultName;
		isEditingVaultName = true;
	}

	function cancelEditingVaultName() {
		isEditingVaultName = false;
		editedVaultName = '';
	}

	function saveVaultName() {
		const trimmed = editedVaultName.trim();
		if (trimmed && trimmed !== vaultName) {
			renameVault(vault.currentId, trimmed);
			settingsMessage = 'Vault renamed';
		}
		isEditingVaultName = false;
		editedVaultName = '';
	}

	function handleVaultNameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveVaultName();
		} else if (e.key === 'Escape') {
			cancelEditingVaultName();
		}
	}

	function handleDeleteVault() {
		deleteVault(vault.currentId);
		vault.lock();
	}
</script>

{#if settings.open}
	<div class="settings-panel">
		<div class="settings-content">
			<h2>Settings</h2>

			<div class="setting-item">
				<div class="setting-info">
					<span class="setting-label">Vault Name</span>
					<span class="setting-description">
						Rename your current vault
					</span>
				</div>
				{#if isEditingVaultName}
					<div class="rename-input-group">
						<input
							type="text"
							bind:value={editedVaultName}
							onkeydown={handleVaultNameKeydown}
							placeholder="Vault name…"
							aria-label="Vault name"
						/>
						<button onclick={saveVaultName} aria-label="Save">
							<Check size={16} />
						</button>
						<button class="secondary" onclick={cancelEditingVaultName} aria-label="Cancel">
							<X size={16} />
						</button>
					</div>
				{:else}
					<button class="secondary" onclick={startEditingVaultName}>
						<SquarePen size={16} />
						{vaultName}
					</button>
				{/if}
			</div>

			{#if biometricAvailable}
				<div class="setting-item">
					<div class="setting-info">
						<span class="setting-label">Biometric Login</span>
						<span class="setting-description">
							Use fingerprint or Face ID to unlock
						</span>
					</div>
					<button
						class="toggle-btn"
						class:active={biometricEnabled}
						onclick={toggleBiometric}
						disabled={settingsLoading}
						aria-label={biometricEnabled ? 'Disable biometric login' : 'Enable biometric login'}
					>
						<span class="toggle-slider"></span>
					</button>
				</div>
			{:else}
				<p class="no-biometric">Biometric login is not available on this device</p>
			{/if}

			<div class="setting-item">
				<div class="setting-info">
					<span class="setting-label">Import Accounts</span>
					<span class="setting-description">
						Import from a text file with otpauth:// URLs
					</span>
				</div>
				<input
					type="file"
					accept=".txt,text/plain"
					bind:this={fileInput}
					onchange={handleFileImport}
					class="hidden-input"
				/>
				<button onclick={triggerImport} disabled={importLoading}>
					{#if importLoading}
						Importing...
					{:else}
						<Upload size={16} />
						Import
					{/if}
				</button>
			</div>

			<div class="setting-item">
				<div class="setting-info">
					<span class="setting-label">Export Accounts</span>
					<span class="setting-description">
						Download accounts as otpauth:// URLs
					</span>
				</div>
				<button class="secondary" onclick={handleExport} disabled={vault.accounts.length === 0}>
					<Download size={16} />
					Export
				</button>
			</div>

			{#if settingsMessage}
				<p class="settings-message" role="status" aria-live="polite">{settingsMessage}</p>
			{/if}

			<div class="danger-zone">
				<h3>Danger Zone</h3>
				{#if showDeleteVaultConfirm}
					<div class="delete-confirm">
						<p>Are you sure you want to delete "{vaultName}"? This will permanently delete all accounts in this vault.</p>
						<div class="delete-actions">
							<button class="secondary" onclick={() => (showDeleteVaultConfirm = false)}>
								Cancel
							</button>
							<button class="danger" onclick={handleDeleteVault}>
								Delete Vault
							</button>
						</div>
					</div>
				{:else}
					<button class="danger-outline" onclick={() => (showDeleteVaultConfirm = true)}>
						<Trash2 size={16} />
						Delete Vault
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-panel {
		background: var(--card-bg);
		border-bottom: 1px solid var(--border);
		padding: var(--space-lg);
	}

	.settings-content {
		max-width: 600px;
		margin: 0 auto;
	}

	.settings-content h2 {
		margin: 0 0 var(--space-lg);
		font-size: var(--text-base);
		color: var(--text-primary);
	}

	.setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-md) 0;
	}

	.setting-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.setting-label {
		font-weight: 500;
		color: var(--text-primary);
	}

	.setting-description {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.no-biometric {
		color: var(--text-secondary);
		font-size: var(--text-sm);
		margin: 0;
	}

	/* Toggle switch - custom component */
	.toggle-btn {
		position: relative;
		width: 48px;
		height: 28px;
		background: var(--border);
		border: none;
		border-radius: 14px;
		padding: 0;
	}

	.toggle-btn.active {
		background: var(--accent);
	}

	.toggle-slider {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 24px;
		height: 24px;
		background: white;
		border-radius: 12px;
		transition: transform var(--transition-base);
	}

	.toggle-btn.active .toggle-slider {
		transform: translateX(20px);
	}

	.settings-message {
		margin: var(--space-md) 0 0;
		padding: var(--space-sm) var(--space-md);
		background: var(--bg);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--text-secondary);
	}

	.rename-input-group {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.rename-input-group input {
		width: 140px;
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-sm);
		border-color: var(--accent);
	}

	.rename-input-group button {
		width: 32px;
		height: 32px;
		padding: 0;
	}

	.hidden-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.danger-zone {
		margin-top: var(--space-xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--border);
	}

	.danger-zone h3 {
		margin: 0 0 var(--space-md);
		font-size: var(--text-xs);
		color: var(--error);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.delete-confirm {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.delete-confirm p {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-secondary);
	}

	.delete-actions {
		display: flex;
		gap: var(--space-md);
	}

	.delete-actions button {
		flex: 1;
	}
</style>
