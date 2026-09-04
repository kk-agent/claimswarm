import {type SwarmEvent} from './state.js';

export type OverlapProof = {
	ok: boolean;
	specialists: string[];
	thirdStartMs: number | null;
	firstCompleteMs: number | null;
	reason: string;
};

const SPECIALISTS = new Set(['Steelman', 'Redteam', 'Contextualist', 'Auditor']);

/**
 * Concurrency proof: three distinct investigators published inference.started
 * before the first of those inferences completed. A join-and-wait pipeline
 * cannot satisfy this.
 */
export function proveOverlap(events: SwarmEvent[]): OverlapProof {
	const starts = events.filter(
		event => event.type === 'inference.started' && SPECIALISTS.has(event.producer),
	);
	const seen = new Set<string>();
	const firstStarts: SwarmEvent[] = [];
	for (const event of starts) {
		if (seen.has(event.producer)) {
			continue;
		}

		seen.add(event.producer);
		firstStarts.push(event);
		if (firstStarts.length === 3) {
			break;
		}
	}

	if (firstStarts.length < 3) {
		return {
			ok: false,
			specialists: firstStarts.map(event => event.producer),
			thirdStartMs: null,
			firstCompleteMs: null,
			reason: `only ${firstStarts.length} specialist inference.started events`,
		};
	}

	const names = new Set(firstStarts.map(event => event.producer));
	const thirdStartMs = Math.max(...firstStarts.map(event => event.ms));
	const completes = events.filter(
		event => event.type === 'inference.completed' && names.has(event.producer),
	);
	const firstCompleteMs = completes.length > 0 ? Math.min(...completes.map(event => event.ms)) : null;

	if (firstCompleteMs === null) {
		return {
			ok: true,
			specialists: [...names],
			thirdStartMs,
			firstCompleteMs: null,
			reason: 'three inference.started events and none of those loops have completed yet',
		};
	}

	if (thirdStartMs < firstCompleteMs) {
		return {
			ok: true,
			specialists: [...names],
			thirdStartMs,
			firstCompleteMs,
			reason: `third start at +${thirdStartMs}ms is before first complete at +${firstCompleteMs}ms`,
		};
	}

	return {
		ok: false,
		specialists: [...names],
		thirdStartMs,
		firstCompleteMs,
		reason: `third start (+${thirdStartMs}ms) was not before first complete (+${firstCompleteMs}ms)`,
	};
}
