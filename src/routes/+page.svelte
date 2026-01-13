<script lang="ts">
	import { browser } from '$app/environment';
	import type { Account } from '$lib/types';
	import { hasVault, saveVault, loadVault } from '$lib/storage';
	import { sampleAccounts } from '$lib/sample-data';
	import UnlockScreen from '$lib/components/UnlockScreen.svelte';
	import OTPList from '$lib/components/OTPList.svelte';

	let unlocked = $state(false);
	let accounts = $state<Account[]>([]);
	// Initialize as null to indicate "checking" state, preventing layout shift
	let isNewVault = $state<boolean | null>(null);
	let currentPassphrase = $state('');

	$effect(() => {
		if (browser) {
			isNewVault = !hasVault();
		}
	});

	async function handleUnlock(passphrase: string) {
		if (isNewVault) {
			accounts = sampleAccounts;
			await saveVault(accounts, passphrase);
			currentPassphrase = passphrase;
			unlocked = true;
		} else {
			accounts = await loadVault(passphrase);
			currentPassphrase = passphrase;
			unlocked = true;
		}
	}

	function handleLock() {
		unlocked = false;
		accounts = [];
		currentPassphrase = '';
	}

	async function handleAddAccount(account: Account) {
		accounts = [...accounts, account];
		await saveVault(accounts, currentPassphrase);
	}

	async function handleImportAccounts(newAccounts: Account[]) {
		accounts = [...accounts, ...newAccounts];
		await saveVault(accounts, currentPassphrase);
	}

	async function handleDeleteAccount(id: string) {
		accounts = accounts.filter((a) => a.id !== id);
		await saveVault(accounts, currentPassphrase);
	}

	async function handleEditAccount(updated: Account) {
		accounts = accounts.map((a) => (a.id === updated.id ? updated : a));
		await saveVault(accounts, currentPassphrase);
	}

	async function handleReorderAccounts(reordered: Account[]) {
		accounts = reordered;
		await saveVault(accounts, currentPassphrase);
	}
</script>

<svelte:head>
	<title>Toofer - 2FA Authenticator</title>
	<meta name="description" content="Secure two-factor authentication app" />
</svelte:head>

{#if unlocked}
	<OTPList
		{accounts}
		onLock={handleLock}
		onAddAccount={handleAddAccount}
		onImportAccounts={handleImportAccounts}
		onDeleteAccount={handleDeleteAccount}
		onEditAccount={handleEditAccount}
		onReorderAccounts={handleReorderAccounts}
		passphrase={currentPassphrase}
	/>
{:else if isNewVault === null}
	<!-- Loading state while checking vault status -->
	<div class="loading-screen">
		<div class="loading-card">
			<div class="logo">
				<span class="logo-icon">2</span>
				<h1>Toofer</h1>
			</div>
			<div class="loading-spinner"></div>
		</div>
	</div>
{:else}
	<UnlockScreen onUnlock={handleUnlock} isNewVault={isNewVault ?? false} />
{/if}

<style>
	.loading-screen {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.loading-card {
		background: var(--card-bg);
		border-radius: 1rem;
		padding: 2rem;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
		text-align: center;
	}

	.logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
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

	.loading-spinner {
		width: 32px;
		height: 32px;
		margin: 0 auto;
		border: 3px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.loading-spinner {
			animation: none;
			border-top-color: var(--border);
			opacity: 0.6;
		}
	}
</style>
