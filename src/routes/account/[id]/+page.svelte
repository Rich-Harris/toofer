<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import {
		getAccountById,
		getPassphrase,
		isUnlocked,
		deleteAccount,
		updateAccount,
		getAccounts,
		setAccounts
	} from '$lib/stores/accounts.svelte';
	import { saveVault } from '$lib/storage';
	import { generateTOTP, getTimeRemaining, getProgress } from '$lib/totp';
	import type { Account } from '$lib/types';

	let account = $state<Account | undefined>(undefined);
	let otp = $state('------');
	let timeRemaining = $state(30);
	let progress = $state(1);
	let lastTimeStep = $state(-1);
	let showDeleteConfirm = $state(false);
	let editing = $state(false);
	let editIssuer = $state('');
	let editName = $state('');

	$effect(() => {
		if (browser) {
			if (!isUnlocked()) {
				goto('/');
				return;
			}
			const id = $page.params.id;
			if (!id) {
				goto('/');
				return;
			}
			account = getAccountById(id);
			if (!account) {
				goto('/');
				return;
			}
			editIssuer = account.issuer;
			editName = account.name;
		}
	});

	$effect(() => {
		if (!account) return;

		let frameId: number;
		const secret = account.secret;

		function update() {
			const currentTimeStep = Math.floor(Date.now() / 1000 / 30);
			if (currentTimeStep !== lastTimeStep) {
				lastTimeStep = currentTimeStep;
				generateTOTP(secret).then((code) => (otp = code));
			}
			timeRemaining = getTimeRemaining();
			progress = getProgress();
			frameId = requestAnimationFrame(update);
		}

		update();
		return () => cancelAnimationFrame(frameId);
	});

	async function handleDelete() {
		if (account) {
			deleteAccount(account.id);
			await saveVault(getAccounts(), getPassphrase());
			goto('/');
		}
	}

	async function handleSave() {
		if (account && (editIssuer !== account.issuer || editName !== account.name)) {
			updateAccount(account.id, { issuer: editIssuer, name: editName });
			await saveVault(getAccounts(), getPassphrase());
			account = getAccountById(account.id);
		}
		editing = false;
	}

	function handleCancel() {
		if (account) {
			editIssuer = account.issuer;
			editName = account.name;
		}
		editing = false;
	}

	function formatOTP(code: string): string {
		return code.slice(0, 3) + ' ' + code.slice(3);
	}
</script>

<svelte:head>
	<title>{account?.issuer ?? 'Account'} - Toofer</title>
</svelte:head>

<div class="account-detail">
	{#if account}
		<main>
			<div class="otp-display">
				<div class="issuer-icon">
					{account.issuer.charAt(0)}
				</div>
				<div class="otp-value" class:expiring={timeRemaining <= 5}>
					{formatOTP(otp)}
				</div>
				<div class="timer-bar" class:expiring={timeRemaining <= 5}>
					<div class="timer-bar-progress" style="width: {progress * 100}%"></div>
				</div>
			</div>

			<div class="details-card">
				{#if editing}
					<div class="field">
						<label for="issuer">Service Name</label>
						<input id="issuer" type="text" bind:value={editIssuer} />
					</div>
					<div class="field">
						<label for="name">Account Name</label>
						<input id="name" type="text" bind:value={editName} />
					</div>
					<div class="edit-actions">
						<button type="button" class="cancel-btn" onclick={handleCancel}>Cancel</button>
						<button type="button" class="save-btn" onclick={handleSave}>Save</button>
					</div>
				{:else}
					<div class="field">
						<label>Service Name</label>
						<span class="value">{account.issuer}</span>
					</div>
					<div class="field">
						<label>Account Name</label>
						<span class="value">{account.name}</span>
					</div>
					<button type="button" class="edit-btn" onclick={() => (editing = true)}>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
						</svg>
						Edit
					</button>
				{/if}
			</div>

			<div class="danger-zone">
				<h2>Danger Zone</h2>
				{#if showDeleteConfirm}
					<div class="delete-confirm">
						<p>Are you sure you want to delete this account? This action cannot be undone.</p>
						<div class="delete-actions">
							<button type="button" class="cancel-btn" onclick={() => (showDeleteConfirm = false)}
								>Cancel</button
							>
							<button type="button" class="delete-btn" onclick={handleDelete}>Delete Account</button
							>
						</div>
					</div>
				{:else}
					<button type="button" class="delete-btn" onclick={() => (showDeleteConfirm = true)}>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<polyline points="3 6 5 6 21 6"></polyline>
							<path
								d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
							></path>
						</svg>
						Delete Account
					</button>
				{/if}
			</div>
		</main>
	{/if}
</div>

<style>
	.account-detail {
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
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.otp-display {
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 2rem;
		text-align: center;
		position: relative;
		overflow: hidden;
	}

	.issuer-icon {
		width: 64px;
		height: 64px;
		background: var(--accent);
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		color: white;
		font-size: 1.75rem;
		margin: 0 auto 1.5rem;
	}

	.otp-value {
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 2.5rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
		transition: color 0.3s;
	}

	.otp-value.expiring {
		color: var(--error);
	}

	.timer-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: var(--border);
	}

	.timer-bar-progress {
		height: 100%;
		background: var(--accent);
	}

	.timer-bar.expiring .timer-bar-progress {
		background: var(--error);
	}

	.details-card {
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field label {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.field .value {
		font-size: 1rem;
		color: var(--text-primary);
	}

	.field input {
		padding: 0.75rem 1rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 1rem;
	}

	.field input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.edit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s;
		margin-top: 0.5rem;
	}

	.edit-btn:hover {
		background: var(--border);
		color: var(--text-primary);
	}

	.edit-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.cancel-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.cancel-btn:hover {
		background: var(--border);
		color: var(--text-primary);
	}

	.save-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		background: var(--accent);
		border: none;
		border-radius: 0.5rem;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.save-btn:hover {
		opacity: 0.9;
	}

	.danger-zone {
		background: var(--card-bg);
		border: 1px solid var(--error);
		border-radius: 1rem;
		padding: 1.5rem;
	}

	.danger-zone h2 {
		margin: 0 0 1rem;
		font-size: 0.875rem;
		color: var(--error);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.delete-confirm {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.delete-confirm p {
		margin: 0;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.delete-actions {
		display: flex;
		gap: 0.75rem;
	}

	.delete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
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

	/* Focus visible */
	.edit-btn:focus-visible,
	.cancel-btn:focus-visible,
	.save-btn:focus-visible,
	.delete-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.field input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.edit-btn,
		.cancel-btn,
		.save-btn,
		.delete-btn,
		.otp-value {
			transition: none;
		}
	}
</style>
