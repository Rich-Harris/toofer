<script lang="ts">
	import type { Account } from '$lib/types';
	import AccountCard from './AccountCard.svelte';
	import QRScanner from './QRScanner.svelte';
	import {
		isPlatformAuthenticatorAvailable,
		hasBiometricCredential,
		registerBiometric,
		removeBiometricCredential
	} from '$lib/webauthn';

	let {
		accounts,
		onLock,
		onAddAccount,
		passphrase
	}: {
		accounts: Account[];
		onLock: () => void;
		onAddAccount: (account: Account) => void;
		passphrase: string;
	} = $props();

	let biometricAvailable = $state(false);
	let biometricEnabled = $state(false);
	let showSettings = $state(false);
	let showScanner = $state(false);
	let settingsMessage = $state('');
	let settingsLoading = $state(false);

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

	function handleScan(account: Account) {
		showScanner = false;
		onAddAccount(account);
	}
</script>

<div class="otp-list">
	<header>
		<div class="header-content">
			<div class="logo">
				<span class="logo-icon">2</span>
				<h1>Toofer</h1>
			</div>
			<div class="header-actions">
				<button
					class="add-btn"
					onclick={() => (showScanner = true)}
					type="button"
					aria-label="Add account"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="12" y1="5" x2="12" y2="19"></line>
						<line x1="5" y1="12" x2="19" y2="12"></line>
					</svg>
				</button>
				<button
					class="settings-btn"
					onclick={() => (showSettings = !showSettings)}
					type="button"
					aria-label="Settings"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="3"></circle>
						<path
							d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
						></path>
					</svg>
				</button>
				<button class="lock-btn" onclick={onLock} type="button">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
					</svg>
					Lock
				</button>
			</div>
		</div>
	</header>

	{#if showSettings}
		<div class="settings-panel">
			<div class="settings-content">
				<h2>Settings</h2>
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
				{#if settingsMessage}
					<p class="settings-message">{settingsMessage}</p>
				{/if}
			</div>
		</div>
	{/if}

	<main>
		{#if accounts.length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<svg
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
					</svg>
				</div>
				<p>No accounts yet</p>
				<p class="hint">Scan a QR code to add your first 2FA account</p>
				<button class="add-first-btn" onclick={() => (showScanner = true)} type="button">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="12" y1="5" x2="12" y2="19"></line>
						<line x1="5" y1="12" x2="19" y2="12"></line>
					</svg>
					Add Account
				</button>
			</div>
		{:else}
			<div class="accounts">
				{#each accounts as account (account.id)}
					<AccountCard {account} />
				{/each}
			</div>
		{/if}
	</main>
</div>

{#if showScanner}
	<QRScanner onScan={handleScan} onClose={() => (showScanner = false)} />
{/if}

<style>
	.otp-list {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		background: var(--card-bg);
		border-bottom: 1px solid var(--border);
		padding: 1rem;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-content {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.logo-icon {
		width: 32px;
		height: 32px;
		background: var(--accent);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		font-weight: bold;
		color: white;
	}

	h1 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--text-primary);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: var(--accent);
		border: none;
		border-radius: 0.5rem;
		color: white;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.add-btn:hover {
		opacity: 0.9;
	}

	.settings-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.2s;
	}

	.settings-btn:hover {
		background: var(--bg);
		color: var(--text-primary);
	}

	.lock-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.875rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.lock-btn:hover {
		background: var(--bg);
		color: var(--text-primary);
	}

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

	main {
		flex: 1;
		padding: 1.5rem 1rem;
		max-width: 600px;
		margin: 0 auto;
		width: 100%;
	}

	.accounts {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--text-secondary);
	}

	.empty-icon {
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state p {
		margin: 0;
	}

	.empty-state .hint {
		font-size: 0.875rem;
		margin-top: 0.5rem;
		color: var(--text-muted);
	}

	.add-first-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
		padding: 0.75rem 1.25rem;
		background: var(--accent);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.add-first-btn:hover {
		opacity: 0.9;
	}
</style>
