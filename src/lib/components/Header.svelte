<script lang="ts">
	import { goto } from '$app/navigation';
	import ThemeToggle from './ThemeToggle.svelte';
	import Logo from './Logo.svelte';
	import * as accountStore from '$lib/stores/accounts.svelte';

	let unlocked = $derived(accountStore.isUnlocked());

	function handleLock() {
		accountStore.lock();
		goto('/');
	}

	function handleSettings() {
		accountStore.toggleSettings();
	}
</script>

{#if unlocked}
	<header>
		<div class="header-content">
			<a href="/" class="logo">
				<Logo size={32} />
				<h1>Toofer</h1>
			</a>
			<div class="header-actions">
				<ThemeToggle />
				<button
					class="settings-btn"
					onclick={handleSettings}
					aria-label="Settings"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="3"></circle>
						<path
							d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
						></path>
					</svg>
				</button>
				<button class="lock-btn" onclick={handleLock}>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
					</svg>
					Lock
				</button>
			</div>
		</div>
	</header>
{/if}

<style>
	header {
		background: var(--card-bg);
		border-bottom: 1px solid var(--border);
		padding: 1rem;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-content {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		margin-right: auto;
	}

	h1 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--text-primary);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.settings-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background-color 0.2s, color 0.2s;
	}

	.settings-btn:hover {
		background: var(--bg);
		color: var(--text-primary);
	}

	.lock-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.875rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.875rem;
		transition: background-color 0.2s, color 0.2s;
	}

	.lock-btn:hover {
		background: var(--bg);
		color: var(--text-primary);
	}

	/* Focus visible */
	.settings-btn:focus-visible,
	.lock-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.settings-btn,
		.lock-btn {
			transition: none;
		}
	}
</style>
