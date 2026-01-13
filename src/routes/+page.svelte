<script lang="ts">
	import { browser } from '$app/environment';
	import type { Account } from '$lib/types';
	import { hasVault, saveVault, loadVault } from '$lib/storage';
	import { sampleAccounts } from '$lib/sample-data';
	import UnlockScreen from '$lib/components/UnlockScreen.svelte';
	import OTPList from '$lib/components/OTPList.svelte';

	let unlocked = $state(false);
	let accounts = $state<Account[]>([]);
	let isNewVault = $state(false);
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
{:else}
	<UnlockScreen onUnlock={handleUnlock} {isNewVault} />
{/if}
