<script lang="ts">
	import { browser } from '$app/environment';
	import type { Account } from '$lib/types';
	import { hasVault, saveVault, loadVault } from '$lib/storage';
	import { sampleAccounts } from '$lib/sample-data';
	import * as accountStore from '$lib/stores/accounts.svelte';
	import UnlockScreen from '$lib/components/UnlockScreen.svelte';
	import OTPList from '$lib/components/OTPList.svelte';

	// Derive from store so UI updates when Header locks the app
	let unlocked = $derived(accountStore.isUnlocked());
	let accounts = $derived(accountStore.getAccounts());
	let currentPassphrase = $derived(accountStore.getPassphrase());
	// Initialize as null to indicate "checking" state, preventing layout shift
	let isNewVault = $state<boolean | null>(null);

	$effect(() => {
		if (browser) {
			isNewVault = !hasVault();
		}
	});

	async function handleUnlock(passphrase: string) {
		let loadedAccounts: Account[];
		if (isNewVault) {
			loadedAccounts = sampleAccounts;
			await saveVault(loadedAccounts, passphrase);
		} else {
			loadedAccounts = await loadVault(passphrase);
		}
		// Update store - derived values will automatically update
		accountStore.setAccounts(loadedAccounts);
		accountStore.setPassphrase(passphrase);
		accountStore.setUnlocked(true);
	}

	function isDuplicate(account: Account): boolean {
		return accounts.some((a) => a.secret === account.secret);
	}

	async function handleAddAccount(account: Account): Promise<{ added: boolean; duplicate: boolean }> {
		if (isDuplicate(account)) {
			return { added: false, duplicate: true };
		}
		const updated = [...accounts, account];
		await saveVault(updated, currentPassphrase);
		accountStore.setAccounts(updated);
		return { added: true, duplicate: false };
	}

	async function handleImportAccounts(newAccounts: Account[]): Promise<{ added: number; duplicates: number }> {
		const existingSecrets = new Set(accounts.map((a) => a.secret));
		const uniqueNewAccounts: Account[] = [];
		let duplicates = 0;

		for (const account of newAccounts) {
			if (existingSecrets.has(account.secret)) {
				duplicates++;
			} else {
				existingSecrets.add(account.secret); // Prevent duplicates within the import batch
				uniqueNewAccounts.push(account);
			}
		}

		if (uniqueNewAccounts.length > 0) {
			const updated = [...accounts, ...uniqueNewAccounts];
			await saveVault(updated, currentPassphrase);
			accountStore.setAccounts(updated);
		}

		return { added: uniqueNewAccounts.length, duplicates };
	}

	async function handleReorderAccounts(reordered: Account[]) {
		await saveVault(reordered, currentPassphrase);
		accountStore.setAccounts(reordered);
	}
</script>

<svelte:head>
	<title>Toofer - 2FA Authenticator</title>
	<meta name="description" content="Secure two-factor authentication app" />
</svelte:head>

{#if unlocked}
	<OTPList
		{accounts}
		onAddAccount={handleAddAccount}
		onImportAccounts={handleImportAccounts}
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
