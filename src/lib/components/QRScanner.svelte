<script lang="ts">
	import { untrack } from 'svelte';
	import { Html5Qrcode } from 'html5-qrcode';
	import { parseOTPAuthURI, otpAuthToAccount, isValidOTPAuthURI } from '$lib/otpauth';
	import type { Account } from '$lib/types';

	let { onScan, onClose }: { onScan: (account: Account) => void; onClose: () => void } = $props();

	let scannerRef: HTMLDivElement | undefined = $state();
	let modalRef: HTMLDivElement | undefined = $state();
	let html5Qrcode: Html5Qrcode | null = null;
	let error = $state('');
	let scanning = $state(false);
	let manualEntry = $state(false);
	let submitting = $state(false);

	// Manual entry fields
	let manualIssuer = $state('');
	let manualName = $state('');
	let manualSecret = $state('');

	$effect(() => {
		if (!manualEntry) {
			untrack(() => startScanner());
		}
		return () => {
			stopScanner();
		};
	});

	// Focus trap and keyboard handling for modal
	$effect(() => {
		if (!modalRef) return;

		const focusableSelector =
			'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
		const previouslyFocused = document.activeElement as HTMLElement;

		// Focus first focusable element
		const firstFocusable = modalRef.querySelector<HTMLElement>(focusableSelector);
		firstFocusable?.focus();

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				e.preventDefault();
				onClose();
				return;
			}

			if (e.key !== 'Tab' || !modalRef) return;

			const focusables = modalRef.querySelectorAll<HTMLElement>(focusableSelector);
			const first = focusables[0];
			const last = focusables[focusables.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last?.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first?.focus();
			}
		}

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			previouslyFocused?.focus();
		};
	});

	async function startScanner() {
		if (!scannerRef || scanning) return;

		error = '';
		scanning = true;

		try {
			html5Qrcode = new Html5Qrcode('qr-reader');

			await html5Qrcode.start(
				{ facingMode: 'environment' },
				{
					fps: 10,
					qrbox: { width: 250, height: 250 }
				},
				onScanSuccess,
				() => {} // Ignore scan failures (no QR found in frame)
			);
		} catch (err) {
			console.error('Failed to start scanner:', err);
			error = 'Could not access camera. Please check permissions or use manual entry.';
			scanning = false;
		}
	}

	async function stopScanner() {
		if (html5Qrcode) {
			try {
				await html5Qrcode.stop();
			} catch {
				// Ignore errors when stopping
			}
			html5Qrcode = null;
		}
		scanning = false;
	}

	function onScanSuccess(decodedText: string) {
		if (!isValidOTPAuthURI(decodedText)) {
			error = 'Invalid QR code. Please scan a valid authenticator QR code.';
			return;
		}

		try {
			const parsed = parseOTPAuthURI(decodedText);
			const account = otpAuthToAccount(parsed);
			stopScanner();
			onScan(account);
		} catch (err) {
			error = 'Failed to parse QR code. Please try again.';
		}
	}

	async function handleManualSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (!manualIssuer.trim()) {
			error = 'Please enter an issuer/service name';
			return;
		}

		if (!manualName.trim()) {
			error = 'Please enter an account name';
			return;
		}

		if (!manualSecret.trim()) {
			error = 'Please enter a secret key';
			return;
		}

		// Clean and validate the secret
		const cleanSecret = manualSecret.toUpperCase().replace(/\s/g, '');
		if (!/^[A-Z2-7]+=*$/.test(cleanSecret)) {
			error = 'Invalid secret key format. Must be Base32 encoded.';
			return;
		}

		submitting = true;

		const account: Account = {
			id: crypto.randomUUID(),
			name: manualName.trim(),
			issuer: manualIssuer.trim(),
			secret: cleanSecret
		};

		onScan(account);
	}

	function toggleManualEntry() {
		if (manualEntry) {
			manualEntry = false;
			// Scanner will start via $effect
		} else {
			stopScanner();
			manualEntry = true;
		}
	}
</script>

<div
	class="scanner-overlay"
	onclick={(e) => e.target === e.currentTarget && onClose()}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	role="presentation"
>
	<div class="scanner-modal" bind:this={modalRef} role="dialog" aria-modal="true" aria-labelledby="scanner-title">
		<header>
			<h2 id="scanner-title">Add Account</h2>
			<button class="close-btn" onclick={onClose} aria-label="Close">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 6L6 18M6 6l12 12"></path>
				</svg>
			</button>
		</header>

		<div class="scanner-content">
			{#if manualEntry}
				<form onsubmit={handleManualSubmit}>
					<p class="instructions">Enter the account details manually</p>

					<div class="input-group">
						<label for="issuer">Service Name</label>
						<input
							id="issuer"
							type="text"
							bind:value={manualIssuer}
							placeholder="e.g., Google, GitHub…"
						/>
					</div>

					<div class="input-group">
						<label for="name">Account Name</label>
						<input
							id="name"
							type="text"
							bind:value={manualName}
							placeholder="e.g., your@email.com…"
						/>
					</div>

					<div class="input-group">
						<label for="secret">Secret Key</label>
						<input
							id="secret"
							type="text"
							bind:value={manualSecret}
							placeholder="e.g., JBSWY3DPEHPK3PXP…"
							autocapitalize="characters"
							autocomplete="off"
						/>
					</div>

					{#if error}
						<p class="error">{error}</p>
					{/if}

					<button type="submit" class="submit-btn" disabled={submitting}>
						{#if submitting}
							Adding…
						{:else}
							Add Account
						{/if}
					</button>
				</form>
			{:else}
				<p class="instructions">Scan the QR code from your authenticator setup page</p>

				<div class="scanner-container">
					<div id="qr-reader" bind:this={scannerRef}></div>
					{#if !scanning && !error}
						<div class="scanner-loading">
							<span>Starting camera...</span>
						</div>
					{/if}
				</div>

				{#if error}
					<p class="error">{error}</p>
				{/if}
			{/if}

			<button class="toggle-btn" onclick={toggleManualEntry}>
				{#if manualEntry}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
						<line x1="3" y1="9" x2="21" y2="9"></line>
						<line x1="9" y1="21" x2="9" y2="9"></line>
					</svg>
					Scan QR Code Instead
				{:else}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
					</svg>
					Enter Manually Instead
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	.scanner-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 100;
		overscroll-behavior: contain;
	}

	.scanner-modal {
		background: var(--card-bg);
		border-radius: 1rem;
		width: 100%;
		max-width: 400px;
		max-height: 90vh;
		overflow: auto;
		overscroll-behavior: contain;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border);
	}

	h2 {
		margin: 0;
		font-size: 1.125rem;
		color: var(--text-primary);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		border-radius: 0.5rem;
		transition: background-color 0.2s, color 0.2s;
	}

	.close-btn:hover {
		background: var(--bg);
		color: var(--text-primary);
	}

	.scanner-content {
		padding: 1.25rem;
	}

	.instructions {
		text-align: center;
		color: var(--text-secondary);
		margin: 0 0 1.25rem;
		font-size: 0.9375rem;
	}

	.scanner-container {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		background: var(--bg);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.scanner-container :global(#qr-reader) {
		width: 100% !important;
		border: none !important;
	}

	.scanner-container :global(#qr-reader video) {
		width: 100% !important;
		height: 100% !important;
		object-fit: cover;
		border-radius: 0.75rem;
	}

	.scanner-container :global(#qr-reader__scan_region) {
		min-height: auto !important;
	}

	.scanner-container :global(#qr-reader__dashboard) {
		display: none !important;
	}

	.scanner-loading {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
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
		margin: 0.75rem 0 0;
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

	.submit-btn:hover {
		opacity: 0.9;
	}

	.toggle-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.9375rem;
		cursor: pointer;
		transition: background-color 0.2s, color 0.2s;
		margin-top: 1rem;
	}

	.toggle-btn:hover {
		background: var(--bg);
		color: var(--text-primary);
	}

	/* Focus visible for buttons */
	.close-btn:focus-visible,
	.submit-btn:focus-visible,
	.toggle-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.close-btn,
		input,
		.submit-btn,
		.toggle-btn {
			transition: none;
		}
	}
</style>
