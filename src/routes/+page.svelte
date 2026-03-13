<script lang="ts">
	import Map from '$lib/components/Map.svelte';
</script>

<svelte:head>
	<title>Fuel Finder NL</title>
</svelte:head>

<div class="relative h-screen w-screen overflow-hidden bg-[#0c1220]">
	<!-- Full-screen map -->
	<Map />

	<!-- Top bar placeholder -->
	<div class="pointer-events-none absolute inset-x-0 top-0 z-10 p-4">
		<div class="glass pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl px-4 py-3">
			<h1 class="text-base font-semibold text-white">Fuel Finder NL</h1>
		</div>
	</div>
</div>
