<script lang="ts">
	import type { Account } from '$lib/types';
	import { generateTOTP, getTimeRemaining } from '$lib/totp';

	let {
		account,
		onDelete,
		onEdit
	}: {
		account: Account;
		onDelete: () => void;
		onEdit: (updated: Account) => void;
	} = $props();

	let otp = $state('------');
	let timeRemaining = $state(30);
	let copied = $state(false);
	let showDeleteConfirm = $state(false);
	let isEditing = $state(false);
	let editIssuer = $state('');
	let editName = $state('');

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

	function handleEditClick(e: Event) {
		e.stopPropagation();
		editIssuer = account.issuer;
		editName = account.name;
		isEditing = true;
	}

	function handleSaveEdit(e: Event) {
		e.stopPropagation();
		if (!editIssuer.trim() || !editName.trim()) return;
		onEdit({
			...account,
			issuer: editIssuer.trim(),
			name: editName.trim()
		});
		isEditing = false;
	}

	function handleCancelEdit(e: Event) {
		e.stopPropagation();
		isEditing = false;
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
		<div class="otp-section">
			<span class="otp" class:expiring={timeRemaining <= 5}>{formatOTP(otp)}</span>
			<div class="timer">
				<svg viewBox="0 0 36 36" class="circular-timer">
					<circle
						class="timer-bg"
						cx="18"
						cy="18"
						r="16"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					></circle>
					<circle
						class="timer-progress"
						cx="18"
						cy="18"
						r="16"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-dasharray="100.53"
						stroke-dashoffset={100.53 * (1 - timeRemaining / 30)}
						transform="rotate(-90 18 18)"
					></circle>
				</svg>
				<span class="timer-text">{timeRemaining}</span>
			</div>
		</div>
		{#if copied}
			<span class="copied-toast">Copied!</span>
		{/if}
	</button>
	<button
		class="edit-btn"
		onclick={handleEditClick}
		type="button"
		aria-label="Edit account"
	>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
			<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
		</svg>
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

	{#if isEditing}
		<div class="edit-overlay">
			<div class="edit-form">
				<div class="edit-field">
					<label for="edit-issuer">Service</label>
					<input
						id="edit-issuer"
						type="text"
						bind:value={editIssuer}
						onclick={(e) => e.stopPropagation()}
					/>
				</div>
				<div class="edit-field">
					<label for="edit-name">Account</label>
					<input
						id="edit-name"
						type="text"
						bind:value={editName}
						onclick={(e) => e.stopPropagation()}
					/>
				</div>
			</div>
			<div class="edit-actions">
				<button class="cancel-btn" onclick={handleCancelEdit} type="button">Cancel</button>
				<button class="save-btn" onclick={handleSaveEdit} type="button">Save</button>
			</div>
		</div>
	{/if}

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
	}

	.account-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.account-card:active {
		transform: translateY(0);
	}

	.edit-btn,
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

	.account-card-wrapper:hover .edit-btn,
	.account-card-wrapper:hover .delete-btn,
	.account-card-wrapper:focus-within .edit-btn,
	.account-card-wrapper:focus-within .delete-btn,
	.edit-btn:focus-visible,
	.delete-btn:focus-visible {
		opacity: 1;
	}

	.edit-btn:hover {
		background: var(--accent);
		border-color: var(--accent);
		color: white;
	}

	.delete-btn:hover {
		background: var(--error);
		border-color: var(--error);
		color: white;
	}

	.edit-btn:focus-visible,
	.delete-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.edit-overlay {
		position: absolute;
		inset: 0;
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		gap: 1rem;
		z-index: 5;
	}

	.edit-form {
		display: flex;
		gap: 0.75rem;
		flex: 1;
	}

	.edit-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.edit-field label {
		font-size: 0.6875rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.edit-field input {
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 0.875rem;
		font-family: inherit;
	}

	.edit-field input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.edit-field input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.edit-actions {
		display: flex;
		gap: 0.5rem;
	}

	.save-btn {
		padding: 0.5rem 0.875rem;
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
	}

	.account-details {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.issuer {
		font-weight: 600;
		color: var(--text-primary);
		font-size: 0.9375rem;
	}

	.name {
		color: var(--text-secondary);
		font-size: 0.8125rem;
	}

	.otp-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.otp {
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 1.375rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		color: var(--text-primary);
		transition: color 0.3s;
		font-variant-numeric: tabular-nums;
	}

	.otp.expiring {
		color: var(--error);
	}

	.timer {
		position: relative;
		width: 32px;
		height: 32px;
	}

	.circular-timer {
		width: 100%;
		height: 100%;
	}

	.timer-bg {
		color: var(--border);
	}

	.timer-progress {
		color: var(--accent);
		transition: stroke-dashoffset 0.3s linear;
	}

	.timer-text {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
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

	.save-btn:focus-visible,
	.cancel-btn:focus-visible,
	.confirm-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.account-card,
		.edit-btn,
		.delete-btn,
		.cancel-btn,
		.save-btn,
		.confirm-btn,
		.edit-field input,
		.otp,
		.timer-progress,
		.toggle-slider,
		.copied-toast {
			transition: none;
		}

		.copied-toast {
			animation: none;
			opacity: 1;
		}
	}
</style>
