<script lang="ts">
	import favicon from '$lib/assets/favicon.png';
	import Header from '$lib/components/Header.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Header />
{@render children()}

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(button, a, input, select, [role="button"]) {
		touch-action: manipulation;
	}

	:global(html, body) {
		margin: 0;
		padding: 0;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
			'Helvetica Neue', sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(body) {
		--bg: #0f0f0f;
		--card-bg: #1a1a1a;
		--border: #2a2a2a;
		--input-bg: #0f0f0f;
		--text-primary: #ffffff;
		--text-secondary: #a0a0a0;
		--text-muted: #666666;
		--accent: hsl(37, 96%, 61%);
		--accent-secondary: hsl(239, 52%, 45%);
		--error: #ef4444;
		--radius-sm: 0.375rem;
		--radius-md: 0.5rem;
		--radius-lg: 0.75rem;

		background: var(--bg);
		color: var(--text-primary);
		min-height: 100vh;
	}

	:global([data-theme='light'] body) {
		--bg: #f5f5f5;
		--card-bg: #ffffff;
		--border: #e5e5e5;
		--input-bg: #ffffff;
		--text-primary: #171717;
		--text-secondary: #525252;
		--text-muted: #a3a3a3;
		--accent: hsl(37, 90%, 50%);
		--accent-secondary: hsl(239, 52%, 37%);
		--error: #dc2626;
	}
</style>
