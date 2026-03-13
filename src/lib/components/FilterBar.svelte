<script lang="ts">
	import type { FuelType } from '$lib/types.js';

	type FilterOption = FuelType | 'electric';

	interface Filter {
		id: FilterOption;
		label: string;
		icon: string;
	}

	const filters: Filter[] = [
		{ id: 'euro95', label: 'Euro 95', icon: '\u26FD' },
		{ id: 'diesel', label: 'Diesel', icon: '\u26FD' },
		{ id: 'lpg', label: 'LPG', icon: '\u26FD' },
		{ id: 'electric', label: 'Elektrisch', icon: '\u26A1' }
	];

	let activeFilter: FilterOption = $state('euro95');

	function selectFilter(id: FilterOption) {
		activeFilter = id;
	}
</script>

<div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4">
	<div class="glass pointer-events-auto mx-auto flex max-w-lg items-center justify-center gap-1.5 rounded-2xl px-3 py-2 sm:gap-2 sm:px-4">
		{#each filters as filter}
			<button
				onclick={() => selectFilter(filter.id)}
				class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:text-sm
					{activeFilter === filter.id
						? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
						: 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}"
				aria-pressed={activeFilter === filter.id}
			>
				<span>{filter.icon}</span>
				<span class="hidden sm:inline">{filter.label}</span>
				<span class="sm:hidden">{filter.label.length > 6 ? filter.label.slice(0, 3) : filter.label}</span>
			</button>
		{/each}
	</div>
</div>
