<script lang="ts">
	let { size = 32 }: { size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 48 48"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	aria-hidden="true"
>
	<rect width="48" height="48" rx="12" fill="var(--accent)" />
	<path
		d="M16 18C16 14.134 19.134 11 23 11H25C28.866 11 32 14.134 32 18C32 20.577 30.577 22.577 28.5 24L18 33C17.5 33.5 17 34 17 35V36H32"
		stroke="white"
		stroke-width="3.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		fill="none"
	/>
</svg>
