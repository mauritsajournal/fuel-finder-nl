<script lang="ts">
	/**
	 * Toast notification component (T-021).
	 * Shows user-friendly messages for errors and status updates.
	 * Auto-dismisses after a configurable duration.
	 */

	interface ToastMessage {
		id: number;
		text: string;
		type: 'error' | 'info' | 'success';
		dismissAt: number;
	}

	let toasts = $state<ToastMessage[]>([]);
	let nextId = 0;

	/** Show a toast notification */
	export function showToast(text: string, type: 'error' | 'info' | 'success' = 'info', durationMs = 4000) {
		const id = nextId++;
		const toast: ToastMessage = {
			id,
			text,
			type,
			dismissAt: Date.now() + durationMs
		};
		toasts = [...toasts, toast];

		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, durationMs);
	}

	/** Dismiss a specific toast */
	function dismiss(id: number) {
		toasts = toasts.filter((t) => t.id !== id);
	}

	const typeStyles: Record<string, string> = {
		error: 'border-red-500/30 bg-red-500/10 text-red-300',
		info: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
		success: 'border-green-500/30 bg-green-500/10 text-green-300'
	};

	const typeIcons: Record<string, string> = {
		error: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
	};
</script>

{#if toasts.length > 0}
	<div class="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-4">
		{#each toasts as toast (toast.id)}
			<div
				class="pointer-events-auto glass flex max-w-sm items-center gap-2 rounded-xl border px-4 py-2.5 shadow-lg {typeStyles[toast.type]}"
				role="alert"
			>
				<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d={typeIcons[toast.type]} />
				</svg>
				<span class="flex-1 text-sm">{toast.text}</span>
				<button
					onclick={() => dismiss(toast.id)}
					class="shrink-0 text-current opacity-50 hover:opacity-100"
					aria-label="Sluiten"
				>
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		{/each}
	</div>
{/if}
