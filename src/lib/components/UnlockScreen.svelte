<script lang="ts">
	import {
		isPlatformAuthenticatorAvailable,
		hasBiometricCredential,
		authenticateWithBiometric
	} from '$lib/webauthn';
	import { getVaultList } from '$lib/storage';
	import type { VaultInfo } from '$lib/types';
	import Logo from './Logo.svelte';
	import Fingerprint from '@lucide/svelte/icons/fingerprint';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';

	let {
		onUnlock,
		onCreateVault
	}: {
		onUnlock: (vaultId: string, passphrase: string) => Promise<void>;
		onCreateVault: (name: string, passphrase: string) => Promise<void>;
	} = $props();

	// Initialize vault list and biometric availability at top level
	const initialVaults = getVaultList();
	const hasBiometric = hasBiometricCredential();
	const biometricAvailable = await isPlatformAuthenticatorAvailable();

	// View states
	type View = 'unlock' | 'create';
	let currentView = $state<View>(initialVaults.length > 0 ? 'unlock' : 'create');
	let selectedVaultId = $state<string>(initialVaults.length > 0 ? initialVaults[0].id : '');

	// Form state
	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let vaultName = $state('');
	let showPassphrase = $state(false);
	let showConfirmPassphrase = $state(false);
	let error = $state('');
	let loading = $state(false);

	// Vault list (can be updated when creating new vaults)
	let vaults = $state<VaultInfo[]>(initialVaults);

	// Derived: get the selected vault object
	let selectedVault = $derived(vaults.find((v) => v.id === selectedVaultId) ?? null);

	function handleVaultChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		if (target.value === '__new__') {
			currentView = 'create';
			resetForm();
		} else {
			selectedVaultId = target.value;
			resetForm();
		}
	}

	function backToUnlock() {
		currentView = 'unlock';
		if (vaults.length > 0) {
			selectedVaultId = vaults[0].id;
		}
		resetForm();
	}

	function resetForm() {
		passphrase = '';
		confirmPassphrase = '';
		vaultName = '';
		showPassphrase = false;
		showConfirmPassphrase = false;
		error = '';
	}

	async function handleUnlock(e: Event) {
		e.preventDefault();
		error = '';

		if (passphrase.length < 4) {
			error = 'Passphrase must be at least 4 characters';
			return;
		}

		if (!selectedVault) {
			return;
		}

		loading = true;
		try {
			await onUnlock(selectedVault.id, passphrase);
		} catch (err) {
			if (err instanceof Error && err.message.includes('subtle')) {
				error = 'Encryption requires HTTPS or localhost';
			} else {
				error = 'Invalid passphrase';
			}
		} finally {
			loading = false;
		}
	}

	async function handleCreate(e: Event) {
		e.preventDefault();
		error = '';

		if (!vaultName.trim()) {
			error = 'Please enter a vault name';
			return;
		}

		if (passphrase !== confirmPassphrase) {
			error = 'Passphrases do not match';
			return;
		}

		if (passphrase.length < 4) {
			error = 'Passphrase must be at least 4 characters';
			return;
		}

		loading = true;
		try {
			await onCreateVault(vaultName.trim(), passphrase);
		} catch (err) {
			if (err instanceof Error && err.message.includes('subtle')) {
				error = 'Encryption requires HTTPS or localhost';
			} else {
				error = err instanceof Error ? err.message : 'Failed to create vault';
			}
		} finally {
			loading = false;
		}
	}

	async function handleBiometricUnlock() {
		error = '';

		if (!selectedVault) {
			return;
		}

		loading = true;
		try {
			const storedPassphrase = await authenticateWithBiometric();
			await onUnlock(selectedVault.id, storedPassphrase);
		} catch (err) {
			error = 'Biometric authentication failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="unlock-screen">
	<div class="unlock-card">
		<div class="logo">
			<Logo size={48} />
			<h1>Toofer</h1>
		</div>

		{#if currentView === 'unlock'}
			<p class="subtitle">Unlock your vault</p>

			{#if vaults.length > 0}
				<div class="input-group">
					<label for="vault-select">Vault</label>
					<select
						id="vault-select"
						value={selectedVaultId}
						onchange={handleVaultChange}
						disabled={loading}
					>
						{#each vaults as vault}
							<option value={vault.id}>{vault.name}</option>
						{/each}
						<option value="__new__">+ Add new vault</option>
					</select>
				</div>
			{/if}

			{#if hasBiometric !== false}
				{#if hasBiometric === null || biometricAvailable === null}
					<div class="biometric-placeholder" aria-hidden="true">
						<div class="biometric-btn-placeholder"></div>
						<div class="divider-placeholder"></div>
					</div>
				{:else if biometricAvailable && hasBiometric}
					<button
						class="biometric-btn"
						onclick={handleBiometricUnlock}
						disabled={loading}
					>
						<Fingerprint size={24} aria-hidden="true" />
						{#if loading}
							Authenticating…
						{:else}
							Unlock with Biometrics
						{/if}
					</button>

					<div class="divider">
						<span>or use passphrase</span>
					</div>
				{/if}
			{/if}

			<form onsubmit={handleUnlock}>
				<div class="input-group">
					<label for="passphrase">Passphrase</label>
					<div class="input-with-toggle">
						<input
							id="passphrase"
							type={showPassphrase ? 'text' : 'password'}
							bind:value={passphrase}
							placeholder="Enter your passphrase…"
							disabled={loading}
							autocomplete="current-password"
						/>
						<button
							type="button"
							class="toggle-visibility"
							onclick={() => (showPassphrase = !showPassphrase)}
							aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
						>
							{#if showPassphrase}
								<EyeOff size={20} />
							{:else}
								<Eye size={20} />
							{/if}
						</button>
					</div>
				</div>

				{#if error}
					<p class="error">{error}</p>
				{/if}

				<button type="submit" class="submit-btn" disabled={loading}>
					{#if loading}
						Unlocking...
					{:else}
						Unlock
					{/if}
				</button>
			</form>

		{:else if currentView === 'create'}
			{#if vaults.length > 0}
				<button class="back-btn" onclick={backToUnlock}>
					<ChevronLeft size={20} />
					Back to unlock
				</button>
			{/if}

			<p class="subtitle">Create a new vault</p>

			<form onsubmit={handleCreate}>
				<div class="input-group">
					<label for="vault-name">Vault Name</label>
					<input
						id="vault-name"
						type="text"
						bind:value={vaultName}
						placeholder="e.g., Personal, Work…"
						disabled={loading}
					/>
				</div>

				<div class="input-group">
					<label for="new-passphrase">Passphrase</label>
					<div class="input-with-toggle">
						<input
							id="new-passphrase"
							type={showPassphrase ? 'text' : 'password'}
							bind:value={passphrase}
							placeholder="Enter a passphrase…"
							disabled={loading}
							autocomplete="new-password"
						/>
						<button
							type="button"
							class="toggle-visibility"
							onclick={() => (showPassphrase = !showPassphrase)}
							aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
						>
							{#if showPassphrase}
								<EyeOff size={20} />
							{:else}
								<Eye size={20} />
							{/if}
						</button>
					</div>
				</div>

				<div class="input-group">
					<label for="confirm">Confirm Passphrase</label>
					<div class="input-with-toggle">
						<input
							id="confirm"
							type={showConfirmPassphrase ? 'text' : 'password'}
							bind:value={confirmPassphrase}
							placeholder="Confirm your passphrase…"
							disabled={loading}
							autocomplete="new-password"
						/>
						<button
							type="button"
							class="toggle-visibility"
							onclick={() => (showConfirmPassphrase = !showConfirmPassphrase)}
							aria-label={showConfirmPassphrase ? 'Hide passphrase' : 'Show passphrase'}
						>
							{#if showConfirmPassphrase}
								<EyeOff size={20} />
							{:else}
								<Eye size={20} />
							{/if}
						</button>
					</div>
				</div>

				{#if error}
					<p class="error">{error}</p>
				{/if}

				<button type="submit" class="submit-btn" disabled={loading}>
					{#if loading}
						Creating...
					{:else}
						Create Vault
					{/if}
				</button>

				<p class="storage-info">Your secrets are kept on this device and are encrypted using your passphrase.</p>
			</form>
		{/if}
	</div>
</div>

<style>
	.unlock-screen {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.unlock-card {
		background: var(--card-bg);
		border-radius: var(--radius-lg);
		corner-shape: squircle;
		padding: var(--space-2xl);
		width: 100%;
		max-width: 400px;
		box-shadow: var(--shadow-md);
	}

	.logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		margin-bottom: var(--space-sm);
	}

	h1 {
		margin: 0;
		font-size: var(--text-3xl);
		color: var(--text-primary);
	}

	.subtitle {
		text-align: center;
		color: var(--text-secondary);
		margin-bottom: var(--space-xl);
	}

	.back-btn {
		padding: var(--space-sm) 0;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		margin-bottom: var(--space-sm);
	}

	.back-btn:hover {
		color: var(--text-primary);
		opacity: 1;
	}

	.biometric-btn {
		width: 100%;
		padding: var(--space-lg);
		margin-top: 1.25rem;
		font-size: var(--text-base);
		font-weight: 600;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		margin-top: var(--space-sm);
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	label {
		font-size: var(--text-sm);
		color: var(--text-secondary);
	}

	.error {
		color: var(--error);
		font-size: var(--text-sm);
		margin: 0;
		text-align: center;
	}

	.storage-info {
		font-size: 0.8125rem;
		color: var(--text-muted);
		text-align: center;
		margin: var(--space-lg) 0 0;
	}

	.submit-btn {
		padding: 0.875rem var(--space-lg);
		font-size: var(--text-base);
		font-weight: 600;
		margin-top: var(--space-sm);
	}

	.biometric-placeholder {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
		margin-top: 1.25rem;
	}

	.biometric-btn-placeholder {
		height: 56px;
		background: var(--border);
		border-radius: var(--radius-md);
		opacity: 0.3;
	}

	.divider-placeholder {
		height: 24px;
	}
</style>
