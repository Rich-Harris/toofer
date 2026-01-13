<script lang="ts">
	import { untrack } from 'svelte';
	import {
		isPlatformAuthenticatorAvailable,
		hasBiometricCredential,
		authenticateWithBiometric
	} from '$lib/webauthn';
	import { getVaultList } from '$lib/storage';
	import type { VaultInfo } from '$lib/types';

	let {
		onUnlock,
		onCreateVault
	}: {
		onUnlock: (vaultId: string, passphrase: string) => Promise<void>;
		onCreateVault: (name: string, passphrase: string) => Promise<void>;
	} = $props();

	// View states
	type View = 'unlock' | 'create';
	let currentView = $state<View>('unlock');
	let selectedVaultId = $state<string>('');

	// Form state
	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let vaultName = $state('');
	let showPassphrase = $state(false);
	let showConfirmPassphrase = $state(false);
	let error = $state('');
	let loading = $state(false);

	// Vault list
	let vaults = $state<VaultInfo[]>([]);

	// Biometric
	let biometricAvailable = $state<boolean | null>(null);
	let hasBiometric = $state<boolean | null>(null);

	// Derived: get the selected vault object
	let selectedVault = $derived(vaults.find((v) => v.id === selectedVaultId) ?? null);

	$effect(() => {
		untrack(() => {
			vaults = getVaultList();

			// Auto-select first vault or show create view
			if (vaults.length > 0) {
				selectedVaultId = vaults[0].id;
				currentView = 'unlock';
			} else {
				currentView = 'create';
			}

			checkBiometricAvailability();
		});
	});

	async function checkBiometricAvailability() {
		hasBiometric = hasBiometricCredential();
		biometricAvailable = await isPlatformAuthenticatorAvailable();
	}

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
			<span class="logo-icon">2</span>
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
						type="button"
						class="biometric-btn"
						onclick={handleBiometricUnlock}
						disabled={loading}
					>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path>
						</svg>
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
							placeholder="Enter your passphrase"
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
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
									<line x1="1" y1="1" x2="23" y2="23"></line>
								</svg>
							{:else}
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
									<circle cx="12" cy="12" r="3"></circle>
								</svg>
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
				<button type="button" class="back-btn" onclick={backToUnlock}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="15 18 9 12 15 6"></polyline>
					</svg>
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
						placeholder="e.g., Personal, Work"
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
							placeholder="Enter a passphrase"
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
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
									<line x1="1" y1="1" x2="23" y2="23"></line>
								</svg>
							{:else}
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
									<circle cx="12" cy="12" r="3"></circle>
								</svg>
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
							placeholder="Confirm your passphrase"
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
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
									<line x1="1" y1="1" x2="23" y2="23"></line>
								</svg>
							{:else}
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
									<circle cx="12" cy="12" r="3"></circle>
								</svg>
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
		padding: 1rem;
	}

	.unlock-card {
		background: var(--card-bg);
		border-radius: 1rem;
		padding: 2rem;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
	}

	.logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.logo-icon {
		width: 48px;
		height: 48px;
		background: var(--accent);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
		color: white;
	}

	h1 {
		margin: 0;
		font-size: 2rem;
		color: var(--text-primary);
	}

	.subtitle {
		text-align: center;
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 0.875rem;
		cursor: pointer;
		margin-bottom: 0.5rem;
		transition: color 0.2s;
	}

	.back-btn:hover {
		color: var(--text-primary);
	}

	.biometric-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--accent);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.biometric-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.biometric-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.divider {
		display: flex;
		align-items: center;
		margin: 1.5rem 0;
		gap: 1rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	.divider span {
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.input-with-toggle {
		position: relative;
		display: flex;
	}

	.input-with-toggle input {
		flex: 1;
		padding-right: 3rem;
	}

	.toggle-visibility {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		color: var(--text-muted);
		cursor: pointer;
		transition: color 0.2s, background-color 0.2s;
	}

	.toggle-visibility:hover {
		color: var(--text-primary);
		background: var(--border);
	}

	.toggle-visibility:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	input,
	select {
		padding: 0.875rem 1rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	select {
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 1rem center;
		padding-right: 2.5rem;
	}

	input:focus,
	select:focus {
		outline: none;
		border-color: var(--accent);
	}

	input:focus-visible,
	select:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	input::placeholder {
		color: var(--text-muted);
	}

	.error {
		color: var(--error);
		font-size: 0.875rem;
		margin: 0;
		text-align: center;
	}

	.submit-btn {
		padding: 0.875rem 1rem;
		background: var(--accent);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
		margin-top: 0.5rem;
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.biometric-placeholder {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.biometric-btn-placeholder {
		height: 56px;
		background: var(--border);
		border-radius: 0.5rem;
		opacity: 0.3;
	}

	.divider-placeholder {
		height: 24px;
	}

	/* Focus visible for buttons */
	.biometric-btn:focus-visible,
	.submit-btn:focus-visible,
	.back-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		input,
		select,
		.biometric-btn,
		.submit-btn,
		.toggle-visibility,
		.back-btn {
			transition: none;
		}
	}
</style>
