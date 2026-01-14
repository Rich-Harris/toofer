<script lang="ts">
	import { goto } from '$app/navigation';
	import ThemeToggle from './ThemeToggle.svelte';
	import Logo from './Logo.svelte';
	import { vault, settings } from '$lib/stores/accounts.svelte';
	import Settings from '@lucide/svelte/icons/settings';
	import Lock from '@lucide/svelte/icons/lock';

	function handleLock() {
		vault.lock();
		goto('/');
	}
</script>

{#if vault.unlocked}
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
					onclick={() => settings.toggle()}
					aria-label="Settings"
				>
					<Settings size={20} />
				</button>
				<button class="lock-btn" onclick={handleLock}>
					<Lock size={20} />
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
