<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import {
		getAccountById,
		getPassphrase,
		getCurrentVaultId,
		isUnlocked,
		deleteAccount,
		updateAccount,
		getAccounts,
		setAccounts
	} from '$lib/stores/accounts.svelte';
	import { saveVault } from '$lib/storage';
	import { generateTOTP, getTimeRemaining, getProgress } from '$lib/totp';
	import { accountToOTPAuthURI } from '$lib/otpauth';
	import { hasBiometricCredential, authenticateWithBiometric } from '$lib/webauthn';
	import QRCode from 'qrcode';
	import type { Account } from '$lib/types';

	let account = $state<Account | undefined>(undefined);
	let otp = $state('------');
	let timeRemaining = $state(30);
	let progress = $state(1);
	let lastTimeStep = $state(-1);
	let showDeleteConfirm = $state(false);
	let editingIssuer = $state(false);
	let editingName = $state(false);
	let editIssuer = $state('');
	let editName = $state('');
	let qrCodeDataUrl = $state('');
	let qrCopied = $state(false);

	// Export authentication state
	let exportUnlocked = $state(false);
	let showExportAuth = $state(false);
	let exportPassphrase = $state('');
	let showExportPassphrase = $state(false);
	let exportError = $state('');
	let exportLoading = $state(false);
	let biometricAvailable = $state(false);

	$effect(() => {
		if (browser) {
			biometricAvailable = hasBiometricCredential();
		}
	});

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

	$effect(() => {
		if (!account || !exportUnlocked) return;

		const otpauthUrl = accountToOTPAuthURI(account);
		QRCode.toDataURL(otpauthUrl, {
			width: 200,
			margin: 2,
			color: {
				dark: '#000000',
				light: '#ffffff'
			}
		}).then((url) => {
			qrCodeDataUrl = url;
		});
	});

	function handleExportClick() {
		showExportAuth = true;
		exportPassphrase = '';
		exportError = '';
	}

	async function handleExportPassphraseSubmit(e: Event) {
		e.preventDefault();
		exportError = '';
		exportLoading = true;

		try {
			const correctPassphrase = getPassphrase();
			if (exportPassphrase === correctPassphrase) {
				exportUnlocked = true;
				showExportAuth = false;
			} else {
				exportError = 'Incorrect passphrase';
			}
		} finally {
			exportLoading = false;
		}
	}

	async function handleExportBiometric() {
		exportError = '';
		exportLoading = true;

		try {
			await authenticateWithBiometric();
			exportUnlocked = true;
			showExportAuth = false;
		} catch {
			exportError = 'Biometric authentication failed';
		} finally {
			exportLoading = false;
		}
	}

	async function copyOTPAuthUrl() {
		if (!account) return;
		const url = accountToOTPAuthURI(account);
		try {
			await navigator.clipboard.writeText(url);
			qrCopied = true;
			setTimeout(() => {
				qrCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	async function handleDelete() {
		if (account) {
			deleteAccount(account.id);
			await saveVault(getCurrentVaultId(), getAccounts(), getPassphrase());
			goto('/');
		}
	}

	async function saveIssuer() {
		if (account && editIssuer.trim() && editIssuer !== account.issuer) {
			updateAccount(account.id, { issuer: editIssuer.trim() });
			await saveVault(getCurrentVaultId(), getAccounts(), getPassphrase());
			account = getAccountById(account.id);
		}
		editingIssuer = false;
	}

	async function saveName() {
		if (account && editName.trim() && editName !== account.name) {
			updateAccount(account.id, { name: editName.trim() });
			await saveVault(getCurrentVaultId(), getAccounts(), getPassphrase());
			account = getAccountById(account.id);
		}
		editingName = false;
	}

	function cancelIssuerEdit() {
		if (account) editIssuer = account.issuer;
		editingIssuer = false;
	}

	function cancelNameEdit() {
		if (account) editName = account.name;
		editingName = false;
	}

	function handleIssuerKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveIssuer();
		} else if (e.key === 'Escape') {
			cancelIssuerEdit();
		}
	}

	function handleNameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveName();
		} else if (e.key === 'Escape') {
			cancelNameEdit();
		}
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
		<header class="account-header">
			<div class="issuer-icon">
				{account.issuer.charAt(0)}
			</div>
			<div class="account-info">
				<div class="info-row">
					{#if editingIssuer}
						<input
							type="text"
							class="edit-input issuer-input"
							bind:value={editIssuer}
							onkeydown={handleIssuerKeydown}
							onblur={saveIssuer}
						/>
					{:else}
						<h1 class="issuer-name">{account.issuer}</h1>
						<button
							type="button"
							class="edit-icon-btn"
							onclick={() => (editingIssuer = true)}
							aria-label="Edit service name"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
							</svg>
						</button>
					{/if}
				</div>
				<div class="info-row">
					{#if editingName}
						<input
							type="text"
							class="edit-input name-input"
							bind:value={editName}
							onkeydown={handleNameKeydown}
							onblur={saveName}
						/>
					{:else}
						<span class="account-name">{account.name}</span>
						<button
							type="button"
							class="edit-icon-btn"
							onclick={() => (editingName = true)}
							aria-label="Edit account name"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
							</svg>
						</button>
					{/if}
				</div>
			</div>
		</header>

		<main>
			<div class="otp-display">
				<div class="otp-value" class:expiring={timeRemaining <= 5}>
					{formatOTP(otp)}
				</div>
				<div class="timer-bar" class:expiring={timeRemaining <= 5}>
					<div class="timer-bar-progress" style="width: {progress * 100}%"></div>
				</div>
			</div>

			<div class="qr-card">
				<h2>Export Account</h2>
				{#if exportUnlocked}
					<p>Scan this QR code to add this account to another device</p>
					<button type="button" class="qr-code" onclick={copyOTPAuthUrl} aria-label="Copy otpauth URL">
						{#if qrCodeDataUrl}
							<img src={qrCodeDataUrl} alt="QR code for {account.issuer}" />
						{/if}
						{#if qrCopied}
							<span class="qr-copied-toast">URL Copied!</span>
						{/if}
					</button>
				{:else if showExportAuth}
					<p>Re-enter your passphrase to reveal the export QR code</p>
					<form class="export-auth-form" onsubmit={handleExportPassphraseSubmit}>
						<div class="input-with-toggle">
							<input
								type={showExportPassphrase ? 'text' : 'password'}
								bind:value={exportPassphrase}
								placeholder="Enter passphrase"
								disabled={exportLoading}
							/>
							<button
								type="button"
								class="toggle-visibility"
								onclick={() => (showExportPassphrase = !showExportPassphrase)}
								aria-label={showExportPassphrase ? 'Hide passphrase' : 'Show passphrase'}
							>
								{#if showExportPassphrase}
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
										<line x1="1" y1="1" x2="23" y2="23"></line>
									</svg>
								{:else}
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
										<circle cx="12" cy="12" r="3"></circle>
									</svg>
								{/if}
							</button>
						</div>
						<div class="export-auth-actions">
							<button
								type="button"
								class="cancel-btn"
								onclick={() => (showExportAuth = false)}
								disabled={exportLoading}
							>
								Cancel
							</button>
							<button type="submit" class="save-btn" disabled={exportLoading || !exportPassphrase}>
								{exportLoading ? 'Verifying...' : 'Unlock'}
							</button>
						</div>
						{#if biometricAvailable}
							<button
								type="button"
								class="biometric-btn"
								onclick={handleExportBiometric}
								disabled={exportLoading}
							>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04c.054-.024.108-.05.162-.077a9.96 9.96 0 0 0 2.018-1.435M6.5 12c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5c0 3.527-1.317 6.746-3.485 9.196M17 12c0-2.761-2.239-5-5-5s-5 2.239-5 5m10 0H7m5-7v0a7 7 0 0 1 7 7v0m-7-7a7 7 0 0 0-7 7v0"></path>
								</svg>
								Use Biometrics
							</button>
						{/if}
						{#if exportError}
							<p class="export-error">{exportError}</p>
						{/if}
					</form>
				{:else}
					<p>Authenticate to reveal the export QR code</p>
					<button type="button" class="reveal-btn" onclick={handleExportClick}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
							<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
						</svg>
						Reveal QR Code
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

	.account-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem 1rem;
		max-width: 600px;
		margin: 0 auto;
		width: 100%;
	}

	.issuer-icon {
		width: 56px;
		height: 56px;
		background: var(--accent);
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		color: white;
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.account-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.info-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.issuer-name {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.account-name {
		font-size: 0.9375rem;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.edit-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--text-muted);
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s, background-color 0.15s, color 0.15s;
		flex-shrink: 0;
	}

	.info-row:hover .edit-icon-btn {
		opacity: 1;
	}

	.edit-icon-btn:hover {
		background: var(--border);
		color: var(--text-primary);
	}

	.edit-icon-btn:focus-visible {
		opacity: 1;
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.edit-input {
		flex: 1;
		min-width: 0;
		padding: 0.375rem 0.625rem;
		border: 1px solid var(--accent);
		border-radius: 6px;
		background: var(--input-bg);
		color: var(--text-primary);
		font-family: inherit;
	}

	.edit-input:focus {
		outline: none;
	}

	.issuer-input {
		font-size: 1.25rem;
		font-weight: 600;
	}

	.name-input {
		font-size: 0.9375rem;
	}

	main {
		flex: 1;
		padding: 0 1rem 1.5rem;
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

	.qr-card {
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.5rem;
		text-align: center;
	}

	.qr-card h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.qr-card p {
		margin: 0 0 1rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.qr-code {
		position: relative;
		display: inline-block;
		padding: 0.75rem;
		background: white;
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: transform 0.15s, box-shadow 0.15s;
	}

	.qr-code:hover {
		transform: scale(1.02);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.qr-code:active {
		transform: scale(0.98);
	}

	.qr-code img {
		display: block;
		width: 200px;
		height: 200px;
	}

	.qr-copied-toast {
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

	.export-auth-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.export-auth-form .input-with-toggle {
		position: relative;
		display: flex;
	}

	.export-auth-form .input-with-toggle input {
		flex: 1;
		padding-right: 3rem;
	}

	.export-auth-form input {
		padding: 0.75rem 1rem;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--input-bg);
		color: var(--text-primary);
		font-size: 1rem;
		text-align: center;
	}

	.export-auth-form input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.toggle-visibility {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		color: var(--text-muted);
		cursor: pointer;
		transition: color 0.2s, background-color 0.2s;
	}

	.toggle-visibility:hover {
		color: var(--text-primary);
		background: var(--border);
	}

	.export-auth-actions {
		display: flex;
		gap: 0.75rem;
	}

	.biometric-btn {
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
		transition: background-color 0.2s, color 0.2s;
	}

	.biometric-btn:hover {
		background: var(--border);
		color: var(--text-primary);
	}

	.biometric-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.reveal-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: var(--accent);
		border: none;
		border-radius: 0.5rem;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.reveal-btn:hover {
		opacity: 0.9;
	}

	.export-error {
		margin: 0;
		padding: 0.5rem;
		color: var(--error);
		font-size: 0.875rem;
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
	.cancel-btn:focus-visible,
	.save-btn:focus-visible,
	.delete-btn:focus-visible,
	.qr-code:focus-visible,
	.biometric-btn:focus-visible,
	.reveal-btn:focus-visible,
	.toggle-visibility:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.edit-input:focus-visible,
	.export-auth-form input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.edit-icon-btn,
		.cancel-btn,
		.save-btn,
		.delete-btn,
		.otp-value,
		.qr-code,
		.qr-copied-toast,
		.biometric-btn,
		.reveal-btn,
		.toggle-visibility {
			transition: none;
			animation: none;
		}

		.qr-copied-toast {
			opacity: 1;
		}
	}
</style>
