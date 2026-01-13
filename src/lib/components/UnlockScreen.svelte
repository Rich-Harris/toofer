<script lang="ts">
	import {
		isPlatformAuthenticatorAvailable,
		hasBiometricCredential,
		authenticateWithBiometric
	} from '$lib/webauthn';

	let {
		onUnlock,
		isNewVault = false
	}: { onUnlock: (passphrase: string) => Promise<void>; isNewVault?: boolean } = $props();

	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let error = $state('');
	let loading = $state(false);
	// Initialize to null to indicate "checking" state, preventing layout shift
	// Both are null during SSR and initial render to avoid hydration mismatch
	let biometricAvailable = $state<boolean | null>(null);
	let hasBiometric = $state<boolean | null>(null);

	$effect(() => {
		checkBiometricAvailability();
	});

	async function checkBiometricAvailability() {
		// Check localStorage first (synchronous) to minimize flash
		hasBiometric = hasBiometricCredential();
		biometricAvailable = await isPlatformAuthenticatorAvailable();
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (isNewVault && passphrase !== confirmPassphrase) {
			error = 'Passphrases do not match';
			return;
		}

		if (passphrase.length < 4) {
			error = 'Passphrase must be at least 4 characters';
			return;
		}

		loading = true;
		try {
			await onUnlock(passphrase);
		} catch (err) {
			if (err instanceof Error && err.message.includes('subtle')) {
				error = 'Encryption requires HTTPS or localhost';
			} else if (isNewVault) {
				error = err instanceof Error ? err.message : 'Failed to create vault';
			} else {
				error = 'Invalid passphrase';
			}
		} finally {
			loading = false;
		}
	}

	async function handleBiometricUnlock() {
		error = '';
		loading = true;

		try {
			const storedPassphrase = await authenticateWithBiometric();
			await onUnlock(storedPassphrase);
		} catch (err) {
			error = 'Biometric authentication failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="unlock-screen">
	<div class="unlock-card">
		<div class="logo">
			<span class="logo-icon">2</span>
			<h1>Toofer</h1>
		</div>
		<p class="subtitle">
			{#if isNewVault}
				Create a passphrase to secure your accounts
			{:else}
				Enter your passphrase to unlock
			{/if}
		</p>

		{#if !isNewVault && hasBiometric !== false}
			{#if hasBiometric === null || biometricAvailable === null}
				<!-- Reserve space while checking biometric availability -->
				<div class="biometric-placeholder" aria-hidden="true">
					<div class="biometric-btn-placeholder"></div>
					<div class="divider-placeholder"></div>
				</div>
			{:else if biometricAvailable && hasBiometric}
				<button
					type="button"
					class="biometric-btn"
					onclick={handleBiometricUnlock}
					disabled={loading}
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path
							d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
						></path>
					</svg>
					{#if loading}
						Authenticating…
					{:else}
						Unlock with Biometrics
					{/if}
				</button>

				<div class="divider">
					<span>or use passphrase</span>
				</div>
			{/if}
		{/if}

		<form onsubmit={handleSubmit}>
			<div class="input-group">
				<label for="passphrase">Passphrase</label>
				<input
					id="passphrase"
					type="password"
					bind:value={passphrase}
					placeholder="Enter your passphrase"
					disabled={loading}
					autocomplete="current-password"
				/>
			</div>

			{#if isNewVault}
				<div class="input-group">
					<label for="confirm">Confirm Passphrase</label>
					<input
						id="confirm"
						type="password"
						bind:value={confirmPassphrase}
						placeholder="Confirm your passphrase"
						disabled={loading}
						autocomplete="new-password"
					/>
				</div>
			{/if}

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<button type="submit" class="submit-btn" disabled={loading}>
				{#if loading}
					Unlocking...
				{:else if isNewVault}
					Create Vault
				{:else}
					Unlock
				{/if}
			</button>
		</form>
	</div>
</div>

<style>
	.unlock-screen {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.unlock-card {
		background: var(--card-bg);
		border-radius: 1rem;
		padding: 2rem;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
	}

	.logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
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

	.subtitle {
		text-align: center;
		color: var(--text-secondary);
		margin-bottom: 2rem;
	}

	.biometric-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--accent);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.biometric-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.biometric-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.divider {
		display: flex;
		align-items: center;
		margin: 1.5rem 0;
		gap: 1rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	.divider span {
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	input {
		padding: 0.875rem 1rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: var(--accent);
	}

	input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	input::placeholder {
		color: var(--text-muted);
	}

	.error {
		color: var(--error);
		font-size: 0.875rem;
		margin: 0;
		text-align: center;
	}

	.submit-btn {
		padding: 0.875rem 1rem;
		background: var(--accent);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
		margin-top: 0.5rem;
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.biometric-placeholder {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.biometric-btn-placeholder {
		height: 56px;
		background: var(--border);
		border-radius: 0.5rem;
		opacity: 0.3;
	}

	.divider-placeholder {
		height: 24px;
	}

	/* Focus visible for buttons */
	.biometric-btn:focus-visible,
	.submit-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		input,
		.biometric-btn,
		.submit-btn {
			transition: none;
		}
	}
</style>
