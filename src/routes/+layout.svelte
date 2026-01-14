<script lang="ts">
	import '$lib/styles/global.css';
	import favicon from '$lib/assets/favicon.png';
	import Header from '$lib/components/Header.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#0f0f0f" />
</svelte:head>

<Header />
<SettingsPanel />
{@render children()}
