<script lang="ts">
	import type { Account } from '$lib/types';
	import { saveVault, loadVault, createVault } from '$lib/storage';
	import { vault } from '$lib/stores/accounts.svelte';
	import UnlockScreen from '$lib/components/UnlockScreen.svelte';
	import OTPList from '$lib/components/OTPList.svelte';
	import Logo from '$lib/components/Logo.svelte';

	// Initialize as null to indicate "checking" state, preventing layout shift
	let ready = $state<boolean>(false);

	$effect(() => {
		ready = true;
	});

	async function handleUnlock(vaultId: string, passphrase: string) {
		const loadedAccounts = await loadVault(vaultId, passphrase);
		vault.accounts = loadedAccounts;
		vault.passphrase = passphrase;
		vault.currentId = vaultId;
		vault.unlocked = true;
	}

	async function handleCreateVault(name: string, passphrase: string) {
		const vaultId = await createVault(name, [], passphrase);
		vault.accounts = [];
		vault.passphrase = passphrase;
		vault.currentId = vaultId;
		vault.unlocked = true;
	}

	function findDuplicate(account: Account): Account | undefined {
		return vault.accounts.find((a) => a.secret === account.secret);
	}

	async function handleAddAccount(account: Account): Promise<{ added: boolean; duplicate: boolean; id: string }> {
		const existing = findDuplicate(account);
		if (existing) {
			return { added: false, duplicate: true, id: existing.id };
		}
		const updated = [...vault.accounts, account];
		await saveVault(vault.currentId, updated, vault.passphrase);
		vault.accounts = updated;
		return { added: true, duplicate: false, id: account.id };
	}

	async function handleReorderAccounts(reordered: Account[]) {
		await saveVault(vault.currentId, reordered, vault.passphrase);
		vault.accounts = reordered;
	}
</script>

<svelte:head>
	<title>Toofer - 2FA Authenticator</title>
	<meta name="description" content="Secure two-factor authentication app" />
</svelte:head>

{#if vault.unlocked}
	<OTPList
		accounts={vault.accounts}
		onAddAccount={handleAddAccount}
		onReorderAccounts={handleReorderAccounts}
	/>
{:else if !ready}
	<!-- Loading state while checking vault status -->
	<div class="loading-screen">
		<div class="loading-card">
			<div class="logo">
				<Logo size={48} />
				<h1>Toofer</h1>
			</div>
			<div class="loading-spinner"></div>
		</div>
	</div>
{:else}
	<UnlockScreen
		onUnlock={handleUnlock}
		onCreateVault={handleCreateVault}
	/>
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
		border-radius: var(--radius-lg);
		corner-shape: squircle;
		padding: 2rem;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		text-align: center;
	}

	.logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
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
