<script lang="ts">
	import { getVehicle, setConsumption, setTankSize } from '$lib/stores/vehicle.svelte.js';

	let visible = $state(false);
	let vehicle = $derived(getVehicle());
</script>

<!-- Gear button -->
<div class="pointer-events-none absolute bottom-20 left-0 z-10 p-3 sm:bottom-24 sm:p-4">
	<button
		onclick={() => { visible = !visible; }}
		class="glass glass-hover pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-all duration-200 sm:h-11 sm:w-11
			{visible ? 'border-blue-300 text-blue-600' : ''}"
		aria-label="Voertuig instellingen"
		title="Voertuig instellingen"
	>
		<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
	</button>
</div>

{#if visible}
	<div class="pointer-events-none absolute bottom-36 left-0 z-10 p-3 sm:bottom-40 sm:p-4">
		<div class="glass pointer-events-auto w-64 rounded-2xl p-4 shadow-lg">
			<h3 class="mb-3 text-sm font-semibold text-gray-800">Voertuig</h3>

			<div class="space-y-3">
				<label>
					<div class="mb-1 flex items-center justify-between text-xs text-gray-500">
						<span>Verbruik</span>
						<span class="font-medium text-gray-700">{vehicle.consumption.toFixed(1)} L/100km</span>
					</div>
					<input
						type="range"
						min="3"
						max="20"
						step="0.5"
						value={vehicle.consumption}
						oninput={(e) => setConsumption(Number((e.target as HTMLInputElement).value))}
						class="w-full"
					/>
					<div class="flex justify-between text-[10px] text-gray-400">
						<span>3.0</span>
						<span>20.0</span>
					</div>
				</label>

				<label>
					<div class="mb-1 flex items-center justify-between text-xs text-gray-500">
						<span>Tankgrootte</span>
						<span class="font-medium text-gray-700">{vehicle.tankSize} L</span>
					</div>
					<input
						type="range"
						min="20"
						max="100"
						step="5"
						value={vehicle.tankSize}
						oninput={(e) => setTankSize(Number((e.target as HTMLInputElement).value))}
						class="w-full"
					/>
					<div class="flex justify-between text-[10px] text-gray-400">
						<span>20L</span>
						<span>100L</span>
					</div>
				</label>
			</div>
		</div>
	</div>
{/if}
