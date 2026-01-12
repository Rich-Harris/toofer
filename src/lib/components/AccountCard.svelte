<script lang="ts">
	import type { Account } from '$lib/types';
	import { generateTOTP, getTimeRemaining } from '$lib/totp';

	let { account }: { account: Account } = $props();

	let otp = $state('------');
	let timeRemaining = $state(30);
	let copied = $state(false);

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
</script>

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

<style>
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
		width: 100%;
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
</style>
