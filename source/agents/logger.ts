import {type SituationContext, SituationSpecification, createHuman} from '@mozaik-ai/core';
import {type ClaimswarmRuntime} from '../runtime.js';

class WhenLoopEvent extends SituationSpecification {
	isSatisfiedBy({event}: SituationContext): boolean {
		return (
			event.type === 'inference.started' ||
			event.type === 'inference.completed' ||
			event.type === 'function_call.started' ||
			event.type === 'function_call.completed' ||
			event.type === 'model.answer' ||
			event.type === 'message.sent' ||
			event.type === 'interception.started' ||
			event.type === 'interception.finished'
		);
	}
}

export function createEventLogger(runtime: ClaimswarmRuntime) {
	return createHuman({
		name: 'EventLog',
		capabilities: ['observe'],
		handlers: [
			{
				specification: new WhenLoopEvent(),
				processor: {
					apply({event}: SituationContext) {
						const state = runtime.resolveRuntime().state;
						let producer = event.producerId;
						try {
							producer = runtime.resolveParticipant(event.producerId).getManifest().name;
						} catch {
							// Producer already left.
						}

						let detail = '';
						if (event.type === 'message.sent') {
							detail = String((event.payload as {message?: string}).message ?? '').slice(0, 180);
						} else if (event.type === 'function_call.started') {
							const call = (event.payload as {call?: {name?: string}}).call;
							detail = call?.name ?? '';
						} else if (event.type === 'model.answer') {
							const text = (event.payload as {answer?: {content?: {text?: string}}}).answer?.content
								?.text;
							detail = (text ?? '').slice(0, 180);
						} else {
							detail = event.type;
						}

						state.log(event.type, producer, detail);
					},
				},
			},
		],
	});
}
