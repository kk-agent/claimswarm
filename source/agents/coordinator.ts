import {type SituationContext, createHuman} from '@mozaik-ai/core';
import {createSpecialist} from './specialists.js';
import {type ClaimswarmRuntime} from '../runtime.js';
import {WhenParticipantJoined, WhenParticipantLeft} from '../situations.js';

type ManifestPayload = {
	id?: string;
	name?: string;
	role?: string;
};

/**
 * Roster + reassignment. When Scout leaves, Auditor join()s — no controller pipeline.
 */
export function createCoordinator(runtime: ClaimswarmRuntime, joinAuditor: () => void) {
	return createHuman({
		name: 'Coordinator',
		capabilities: ['roster', 'reassignment'],
		handlers: [
			{
				specification: new WhenParticipantJoined(),
				processor: {
					apply({event}: SituationContext) {
						const state = runtime.resolveRuntime().state;
						const manifest = event.payload as ManifestPayload;
						if (manifest.name) {
							state.addRoster(manifest.name);
							state.log('participant.joined', manifest.name, manifest.role ?? 'participant');
						}
					},
				},
			},
			{
				specification: new WhenParticipantLeft(),
				processor: {
					apply({event}: SituationContext) {
						const state = runtime.resolveRuntime().state;
						const manifest = event.payload as ManifestPayload;
						if (manifest.name) {
							state.removeRoster(manifest.name);
							state.log('participant.left', manifest.name, 'slot opened');
						}

						if (manifest.name === 'Scout' && !state.reserveJoined) {
							state.reserveJoined = true;
							joinAuditor();
							state.log('reassignment', 'Coordinator', 'Scout left — Auditor join()s the same runtime');
						}
					},
				},
			},
		],
	});
}

export function spawnAuditor(runtime: ClaimswarmRuntime): void {
	const auditor = createSpecialist(runtime, 'auditor');
	runtime.join(auditor);
}
