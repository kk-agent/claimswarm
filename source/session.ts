import {type InferenceRunner, createHuman} from '@mozaik-ai/core';
import {createCoordinator, spawnAuditor} from './agents/coordinator.js';
import {createEventLogger} from './agents/logger.js';
import {createSentry} from './agents/sentry.js';
import {createSpecialist} from './agents/specialists.js';
import {createSynthesizer} from './agents/synthesizer.js';
import {type ClaimswarmRuntime, createClaimswarmRuntime} from './runtime.js';
import {SimulatedInferenceRunner} from './simulation/inference-runner.js';
import {ClaimswarmState} from './state.js';

export type SwarmMode = 'sim' | 'live';

export type ClaimswarmSession = {
	runtime: ClaimswarmRuntime;
	state: ClaimswarmState;
	send: (message: string) => void;
	leaveScout: () => void;
	userId: string;
};

export function hasLiveKey(): boolean {
	return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
}

export function resolveMode(requested?: SwarmMode): SwarmMode {
	if (requested === 'live') {
		if (!hasLiveKey()) {
			throw new Error('OPENAI_API_KEY is required for live mode');
		}

		return 'live';
	}

	if (requested === 'sim') {
		return 'sim';
	}

	return hasLiveKey() ? 'live' : 'sim';
}

export function createClaimswarmSession(requested?: SwarmMode): ClaimswarmSession {
	const mode = resolveMode(requested);
	const runtime = createClaimswarmRuntime();
	const state = new ClaimswarmState();
	state.mode = mode;
	state.startedAt = Date.now();

	const runner: InferenceRunner | undefined =
		mode === 'sim' ? new SimulatedInferenceRunner() : undefined;
	runtime.initializeRuntime({
		state,
		inferenceRunnerConfig: runner ? {runner} : undefined,
	});

	const user = createHuman({name: 'Operator', capabilities: ['input'], handlers: []});
	const scout = createHuman({name: 'Scout', capabilities: ['transient'], handlers: []});
	const coordinator = createCoordinator(runtime, () => {
		spawnAuditor(runtime);
	});

	runtime.join(coordinator);
	runtime.join(createEventLogger(runtime));
	runtime.join(createSentry(runtime));
	runtime.join(createSynthesizer(runtime));
	runtime.join(user);
	runtime.join(createSpecialist(runtime, 'steelman'));
	runtime.join(createSpecialist(runtime, 'redteam'));
	runtime.join(createSpecialist(runtime, 'contextualist'));
	runtime.join(scout);

	return {
		runtime,
		state,
		userId: user.getId(),
		send: (message: string) => {
			if (!state.claim) {
				state.setClaim(message);
			}

			runtime.sendMessage(message, user.getId());
		},
		leaveScout: () => {
			runtime.leave(scout);
		},
	};
}
