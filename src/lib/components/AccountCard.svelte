<script lang="ts">
	import type { Account } from '$lib/types';
	import { generateTOTP, getTimeRemaining, getProgress } from '$lib/totp';

	let {
		account
	}: {
		account: Account;
	} = $props();

	let otp = $state('------');
	let timeRemaining = $state(30);
	let progress = $state(1);
	let copied = $state(false);
	let lastTimeStep = $state(-1);

	$effect(() => {
		let frameId: number;

		function update() {
			const currentTimeStep = Math.floor(Date.now() / 1000 / 30);
			if (currentTimeStep !== lastTimeStep) {
				lastTimeStep = currentTimeStep;
				generateTOTP(account.secret).then((code) => (otp = code));
			}
			timeRemaining = getTimeRemaining();
			progress = getProgress();
			frameId = requestAnimationFrame(update);
		}

		update();
		return () => cancelAnimationFrame(frameId);
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
</script>

<div
	class="account-card"
	onclick={(e) => {
		if (!(e.target as HTMLElement).closest('.settings-link')) {
			copyToClipboard();
		}
	}}
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === 'Enter' && !(e.target as HTMLElement).closest('.settings-link')) {
			copyToClipboard();
		}
	}}
>
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
	<a
		href="/account/{account.id}"
		class="settings-link"
		aria-label="Account settings"
	>
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="3"></circle>
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
		</svg>
	</a>
	<div class="timer-bar" class:expiring={timeRemaining <= 5}>
		<div class="timer-bar-progress" style="width: {progress * 100}%"></div>
	</div>
	{#if copied}
		<span class="copied-toast" role="status" aria-live="polite">Copied!</span>
	{/if}
</div>

<style>
	.account-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: var(--card-bg);
		border-radius: var(--radius-lg);
		corner-shape: squircle;
		cursor: pointer;
		transition: transform 0.15s, box-shadow 0.15s;
		position: relative;
		border: 1px solid var(--border);
		overflow: hidden;
	}

	.account-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.account-card:active {
		transform: translateY(0);
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
		border-radius: var(--radius-md);
		corner-shape: squircle;
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

	.settings-link {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem;
		color: var(--text-muted);
		border-radius: 0.375rem;
		transition: color 0.2s, background-color 0.2s;
		flex-shrink: 0;
	}

	.settings-link:hover {
		color: var(--text-primary);
		background: var(--border);
	}

	.settings-link:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.timer-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: var(--border);
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
		overflow: hidden;
	}

	.timer-bar-progress {
		height: 100%;
		background: var(--accent);
		border-radius: 0 0 0 var(--radius-lg);
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

	/* Focus visible for main card */
	.account-card:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.account-card,
		.settings-link,
		.otp,
		.copied-toast {
			transition: none;
		}

		.copied-toast {
			animation: none;
			opacity: 1;
		}
	}
</style>
