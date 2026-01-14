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
				<button class="icon" onclick={() => settings.toggle()} aria-label="Settings">
					<Settings size={20} />
				</button>
				<button class="secondary" onclick={handleLock}>
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
		padding: var(--space-lg);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-content {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: var(--space-lg);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		text-decoration: none;
		margin-right: auto;
	}

	h1 {
		margin: 0;
		font-size: var(--text-xl);
		color: var(--text-primary);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}
</style>
