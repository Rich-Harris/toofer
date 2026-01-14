<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Account } from '$lib/types';
	import AccountCard from './AccountCard.svelte';
	import QRScanner from './QRScanner.svelte';
	import Lock from '@lucide/svelte/icons/lock';
	import Plus from '@lucide/svelte/icons/plus';

	let {
		accounts,
		onAddAccount,
		onReorderAccounts
	}: {
		accounts: Account[];
		onAddAccount: (account: Account) => Promise<{ added: boolean; duplicate: boolean; id: string }>;
		onReorderAccounts: (accounts: Account[]) => void;
	} = $props();

	let showScanner = $state(false);
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	async function handleScan(account: Account) {
		showScanner = false;
		const result = await onAddAccount(account);
		goto(`/account/${result.id}`);
	}

	function handleDragStart(e: DragEvent, index: number) {
		draggedIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(e: DragEvent, dropIndex: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === dropIndex) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}

		const reordered = [...accounts];
		const [removed] = reordered.splice(draggedIndex, 1);
		reordered.splice(dropIndex, 0, removed);
		onReorderAccounts(reordered);

		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}
</script>

<div class="otp-list">
	<main>
		{#if accounts.length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<Lock size={48} strokeWidth={1.5} />
				</div>
				<p>No accounts yet</p>
				<p class="hint">Scan a QR code to add your first 2FA account</p>
				<button class="add-first-btn" onclick={() => (showScanner = true)}>
					<Plus size={20} />
					Add Account
				</button>
			</div>
		{:else}
			<div class="accounts">
				{#each accounts as account, index (account.id)}
					<div
						class="account-item"
						class:dragging={draggedIndex === index}
						class:drag-over={dragOverIndex === index && draggedIndex !== index}
						draggable="true"
						ondragstart={(e) => handleDragStart(e, index)}
						ondragover={(e) => handleDragOver(e, index)}
						ondragleave={handleDragLeave}
						ondrop={(e) => handleDrop(e, index)}
						ondragend={handleDragEnd}
						role="listitem"
					>
							<AccountCard {account} />
					</div>
				{/each}
				<button class="add-account-btn" onclick={() => (showScanner = true)}>
					<Plus size={20} />
					Add Account
				</button>
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

	.add-account-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 1rem;
		background: var(--accent);
		border: none;
		border-radius: 0.75rem;
		color: white;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.add-account-btn:hover {
		opacity: 0.9;
	}

	.account-item {
		position: relative;
		cursor: grab;
		transition: opacity 0.2s, transform 0.2s;
	}

	.account-item:active {
		cursor: grabbing;
	}

	.account-item.dragging {
		opacity: 0.5;
	}

	.account-item.drag-over {
		transform: translateY(4px);
	}

	.account-item.drag-over::before {
		content: '';
		position: absolute;
		top: -4px;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--accent);
		border-radius: 1px;
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

	/* Focus visible for all buttons */
	.add-first-btn:focus-visible,
	.add-account-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.add-first-btn,
		.add-account-btn,
		.account-item {
			transition: none;
			animation: none;
		}
	}
</style>
