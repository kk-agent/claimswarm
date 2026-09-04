import {defineRuntime} from '@mozaik-ai/core';
import {ClaimswarmState} from './state.js';

export function createClaimswarmRuntime() {
	return defineRuntime<ClaimswarmState>();
}

export type ClaimswarmRuntime = ReturnType<typeof createClaimswarmRuntime>;
