<script lang="ts">
	import type { Account } from '$lib/types';
	import { generateTOTP, getTimeRemaining } from '$lib/totp';

	let {
		account,
		onDelete
	}: {
		account: Account;
		onDelete: () => void;
	} = $props();

	let otp = $state('------');
	let timeRemaining = $state(30);
	let copied = $state(false);
	let showDeleteConfirm = $state(false);

	async function updateOTP() {
		otp = await generateTOTP(account.secret);
		timeRemaining = getTimeRemaining();
	}

	$effect(() => {
		updateOTP();
		const interval = setInterval(updateOTP, 1000);
		return () => clearInterval(interval);
	});

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(otp);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function formatOTP(code: string): string {
		return code.slice(0, 3) + ' ' + code.slice(3);
	}

	function handleDeleteClick(e: Event) {
		e.stopPropagation();
		showDeleteConfirm = true;
	}

	function handleConfirmDelete(e: Event) {
		e.stopPropagation();
		onDelete();
	}

	function handleCancelDelete(e: Event) {
		e.stopPropagation();
		showDeleteConfirm = false;
	}
</script>

<div class="account-card-wrapper">
	<button class="account-card" onclick={copyToClipboard} type="button">
		<div class="account-info">
			<div class="issuer-icon">
				{account.issuer.charAt(0)}
			</div>
			<div class="account-details">
				<span class="issuer">{account.issuer}</span>
				<span class="name">{account.name}</span>
			</div>
		</div>
		<span class="otp" class:expiring={timeRemaining <= 5}>{formatOTP(otp)}</span>
		<div class="timer-bar" class:expiring={timeRemaining <= 5}>
			<div class="timer-bar-progress" style="width: {(timeRemaining / 30) * 100}%"></div>
		</div>
		{#if copied}
			<span class="copied-toast">Copied!</span>
		{/if}
	</button>
	<button
		class="delete-btn"
		onclick={handleDeleteClick}
		type="button"
		aria-label="Delete account"
	>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<polyline points="3 6 5 6 21 6"></polyline>
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
		</svg>
	</button>

	{#if showDeleteConfirm}
		<div class="delete-confirm">
			<span>Delete this account?</span>
			<div class="delete-actions">
				<button class="cancel-btn" onclick={handleCancelDelete} type="button">Cancel</button>
				<button class="confirm-btn" onclick={handleConfirmDelete} type="button">Delete</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.account-card-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.account-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: var(--card-bg);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: transform 0.15s, box-shadow 0.15s;
		position: relative;
		border: 1px solid var(--border);
		flex: 1;
		text-align: left;
		font-family: inherit;
		overflow: hidden;
	}

	.account-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.account-card:active {
		transform: translateY(0);
	}

	.delete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		min-width: 36px;
		min-height: 36px;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background-color 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s;
		opacity: 0;
	}

	.account-card-wrapper:hover .delete-btn,
	.account-card-wrapper:focus-within .delete-btn,
	.delete-btn:focus-visible {
		opacity: 1;
	}

	.delete-btn:hover {
		background: var(--error);
		border-color: var(--error);
		color: white;
	}

	.delete-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.delete-confirm {
		position: absolute;
		inset: 0;
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		z-index: 5;
	}

	.delete-confirm span {
		font-weight: 500;
		color: var(--text-primary);
	}

	.delete-actions {
		display: flex;
		gap: 0.5rem;
	}

	.cancel-btn {
		padding: 0.5rem 0.875rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s, color 0.2s;
	}

	.cancel-btn:hover {
		background: var(--bg);
		color: var(--text-primary);
	}

	.confirm-btn {
		padding: 0.5rem 0.875rem;
		background: var(--error);
		border: none;
		border-radius: 0.5rem;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.confirm-btn:hover {
		opacity: 0.9;
	}

	.account-info {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		min-width: 0;
		flex: 1;
	}

	.issuer-icon {
		width: 40px;
		height: 40px;
		background: var(--accent);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		color: white;
		font-size: 1.125rem;
		flex-shrink: 0;
	}

	.account-details {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
		flex: 1;
	}

	.issuer {
		font-weight: 600;
		color: var(--text-primary);
		font-size: 0.9375rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.name {
		color: var(--text-secondary);
		font-size: 0.8125rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.otp {
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 1.375rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		color: var(--text-primary);
		transition: color 0.3s;
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}

	.otp.expiring {
		color: var(--error);
	}

	.timer-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: var(--border);
		border-radius: 0 0 0.75rem 0.75rem;
		overflow: hidden;
	}

	.timer-bar-progress {
		height: 100%;
		background: var(--accent);
		transition: width 1s linear;
		border-radius: 0 0 0 0.75rem;
	}

	.timer-bar.expiring .timer-bar-progress {
		background: var(--error);
	}

	.copied-toast {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: var(--accent);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		animation: fade-in-out 2s ease-in-out;
	}

	@keyframes fade-in-out {
		0%,
		100% {
			opacity: 0;
		}
		10%,
		90% {
			opacity: 1;
		}
	}

	/* Focus visible for main card button */
	.account-card:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.cancel-btn:focus-visible,
	.confirm-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.account-card,
		.delete-btn,
		.cancel-btn,
		.confirm-btn,
		.otp,
		.timer-bar-progress,
		.copied-toast {
			transition: none;
		}

		.copied-toast {
			animation: none;
			opacity: 1;
		}
	}
</style>
