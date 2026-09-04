import {
	type FunctionCallItem,
	type SituationContext,
	createHuman,
} from '@mozaik-ai/core';
import {type ClaimswarmRuntime} from '../runtime.js';
import {WhenFunctionCallStarted, WhenInterceptionFires} from '../situations.js';

/**
 * Live policy participant. Reacts to other agents' function_call.started
 * while those agents are still inside runLoop — it does not wait for idle.
 */
export function createSentry(runtime: ClaimswarmRuntime) {
	return createHuman({
		name: 'Sentry',
		capabilities: ['policy', 'listen:function_call.started'],
		handlers: [
			{
				specification: new WhenFunctionCallStarted(),
				processor: {
					apply({event}: SituationContext) {
						const state = runtime.resolveRuntime().state;
						const payload = event.payload as {call?: FunctionCallItem};
						const callName = payload.call?.name ?? 'unknown';
						const producer = runtime.resolveParticipant(event.producerId).getManifest().name;
						const stillInferring = state.eventLog.filter(
							entry =>
								entry.type === 'inference.started' &&
								!state.eventLog.some(
									done =>
										done.type === 'inference.completed' &&
										done.producer === entry.producer &&
										done.ms >= entry.ms,
								),
						);
						state.addSentryFlag({
							at: state.now(),
							reason: `${producer} started ${callName} while ${stillInferring.length} inference(s) still open`,
							sourceEvent: 'function_call.started',
							producer,
						});
						state.log(
							'sentry.reacted',
							'Sentry',
							`${producer}.${callName} — reacting before that loop finishes`,
						);
					},
				},
			},
			{
				specification: new WhenInterceptionFires(),
				processor: {
					apply({event}: SituationContext) {
						const state = runtime.resolveRuntime().state;
						const producer = runtime.resolveParticipant(event.producerId).getManifest().name;
						state.log(event.type, producer, 'policy interceptor rewrote the pending transition');
						if (event.type === 'interception.started') {
							state.addSentryFlag({
								at: state.now(),
								reason: `Aborted overconfident model_message from ${producer}`,
								sourceEvent: 'interception.started',
								producer,
							});
						}
					},
				},
			},
		],
	});
}
