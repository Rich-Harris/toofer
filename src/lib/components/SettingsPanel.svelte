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
	import * as accountStore from '$lib/stores/accounts.svelte';

	let accounts = $derived(accountStore.getAccounts());
	let passphrase = $derived(accountStore.getPassphrase());
	let currentVaultId = $derived(accountStore.getCurrentVaultId());
	let vaultName = $derived(getVaultInfo(currentVaultId)?.name ?? 'Vault');
	let showSettings = $derived(accountStore.isShowingSettings());

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
				await registerBiometric(passphrase);
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
				const existingSecrets = new Set(accounts.map((a) => a.secret));
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
					const updated = [...accounts, ...uniqueNewAccounts];
					await saveVault(currentVaultId, updated, passphrase);
					accountStore.setAccounts(updated);
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
		if (accounts.length === 0) {
			settingsMessage = 'No accounts to export';
			return;
		}

		const lines = accounts.map((account) => accountToOTPAuthURI(account));
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
		settingsMessage = `Exported ${accounts.length} account${accounts.length === 1 ? '' : 's'}`;
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
			renameVault(currentVaultId, trimmed);
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
		deleteVault(currentVaultId);
		accountStore.lock();
	}
</script>

{#if showSettings}
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
							class="rename-input"
							bind:value={editedVaultName}
							onkeydown={handleVaultNameKeydown}
							placeholder="Vault name…"
							aria-label="Vault name"
						/>
						<button type="button" class="save-btn" onclick={saveVaultName} aria-label="Save">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
						</button>
						<button type="button" class="cancel-edit-btn" onclick={cancelEditingVaultName} aria-label="Cancel">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</button>
					</div>
				{:else}
					<button type="button" class="edit-name-btn" onclick={startEditingVaultName}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
						</svg>
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
						type="button"
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
				<button
					class="import-btn"
					onclick={triggerImport}
					disabled={importLoading}
					type="button"
				>
					{#if importLoading}
						Importing...
					{:else}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
							<polyline points="17 8 12 3 7 8"></polyline>
							<line x1="12" y1="3" x2="12" y2="15"></line>
						</svg>
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
				<button
					class="export-btn"
					onclick={handleExport}
					disabled={accounts.length === 0}
					type="button"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
						<polyline points="7 10 12 15 17 10"></polyline>
						<line x1="12" y1="15" x2="12" y2="3"></line>
					</svg>
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
							<button type="button" class="cancel-btn" onclick={() => (showDeleteVaultConfirm = false)}>
								Cancel
							</button>
							<button type="button" class="delete-btn" onclick={handleDeleteVault}>
								Delete Vault
							</button>
						</div>
					</div>
				{:else}
					<button type="button" class="delete-vault-btn" onclick={() => (showDeleteVaultConfirm = true)}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3 6 5 6 21 6"></polyline>
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
						</svg>
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
		padding: 1rem;
	}

	.settings-content {
		max-width: 600px;
		margin: 0 auto;
	}

	.settings-content h2 {
		margin: 0 0 1rem;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 0;
	}

	.setting-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
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
		font-size: 0.875rem;
		margin: 0;
	}

	.toggle-btn {
		position: relative;
		width: 48px;
		height: 28px;
		background: var(--border);
		border: none;
		border-radius: 14px;
		cursor: pointer;
		transition: background 0.2s;
		padding: 0;
	}

	.toggle-btn.active {
		background: var(--accent);
	}

	.toggle-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.toggle-slider {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 24px;
		height: 24px;
		background: white;
		border-radius: 12px;
		transition: transform 0.2s;
	}

	.toggle-btn.active .toggle-slider {
		transform: translateX(20px);
	}

	.settings-message {
		margin: 0.75rem 0 0;
		padding: 0.5rem 0.75rem;
		background: var(--bg);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.edit-name-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-primary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: border-color 0.2s, background-color 0.2s;
	}

	.edit-name-btn:hover {
		border-color: var(--accent);
		background: var(--bg);
	}

	.rename-input-group {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.rename-input {
		width: 140px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--accent);
		border-radius: 0.5rem;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.875rem;
	}

	.rename-input:focus {
		outline: none;
	}

	.save-btn,
	.cancel-edit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.save-btn {
		background: var(--accent);
		color: white;
	}

	.save-btn:hover {
		opacity: 0.9;
	}

	.cancel-edit-btn {
		background: var(--border);
		color: var(--text-secondary);
	}

	.cancel-edit-btn:hover {
		background: var(--text-muted);
		color: var(--text-primary);
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

	.import-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		background: var(--accent);
		border: none;
		border-radius: 0.5rem;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.import-btn:hover {
		opacity: 0.9;
	}

	.import-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.export-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s, color 0.2s;
	}

	.export-btn:hover {
		background: var(--bg);
		color: var(--text-primary);
	}

	.export-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.danger-zone {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	.danger-zone h3 {
		margin: 0 0 0.75rem;
		font-size: 0.75rem;
		color: var(--error);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.delete-vault-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: transparent;
		border: 1px solid var(--error);
		border-radius: 0.5rem;
		color: var(--error);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s, color 0.2s;
	}

	.delete-vault-btn:hover {
		background: var(--error);
		color: white;
	}

	.delete-confirm {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.delete-confirm p {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.delete-actions {
		display: flex;
		gap: 0.75rem;
	}

	.cancel-btn {
		flex: 1;
		padding: 0.625rem 1rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s, color 0.2s;
	}

	.cancel-btn:hover {
		background: var(--border);
		color: var(--text-primary);
	}

	.delete-btn {
		flex: 1;
		padding: 0.625rem 1rem;
		background: var(--error);
		border: none;
		border-radius: 0.5rem;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.delete-btn:hover {
		opacity: 0.9;
	}

	/* Focus visible for all buttons */
	.toggle-btn:focus-visible,
	.import-btn:focus-visible,
	.export-btn:focus-visible,
	.delete-vault-btn:focus-visible,
	.cancel-btn:focus-visible,
	.delete-btn:focus-visible,
	.edit-name-btn:focus-visible,
	.save-btn:focus-visible,
	.cancel-edit-btn:focus-visible,
	.rename-input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.toggle-btn,
		.toggle-slider,
		.import-btn,
		.export-btn,
		.delete-vault-btn,
		.cancel-btn,
		.delete-btn,
		.edit-name-btn,
		.save-btn,
		.cancel-edit-btn {
			transition: none;
			animation: none;
		}
	}
</style>
