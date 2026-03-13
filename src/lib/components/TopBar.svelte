<script lang="ts">
	// Search input placeholder - will be connected to geocoding in T-018
	let searchQuery = $state('');
</script>

<div class="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 sm:p-4">
	<div class="glass pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl px-4 py-2.5 transition-all duration-200">
		<!-- App name -->
		<h1 class="shrink-0 text-sm font-semibold text-white sm:text-base">
			Fuel Finder NL
		</h1>

		<!-- Search input -->
		<div class="relative flex-1">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Zoek stad of adres..."
				class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-500/50 focus:bg-white/8"
			/>
			{#if searchQuery}
				<button
					onclick={() => (searchQuery = '')}
					class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
					aria-label="Wis zoekveld"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>
</div>
