import {type FunctionCallItem, type ModelMessageItem, type SituationContext, createHuman} from '@mozaik-ai/core';
import {type ClaimswarmRuntime} from '../runtime.js';
import {type Stance} from '../state.js';
import {
	WhenFunctionCallCompleted,
	WhenFunctionCallStarted,
	WhenModelAnswers,
} from '../situations.js';

function asStance(value: unknown): Stance {
	if (value === 'support' || value === 'refute' || value === 'context') {
		return value;
	}

	return 'context';
}

function toolOutputText(payload: unknown): string {
	if (!payload || typeof payload !== 'object') {
		return '';
	}

	const record = payload as {
		output?: {text?: string} | string;
		item?: {output?: {text?: string} | string};
	};

	if (typeof record.output === 'string') {
		return record.output;
	}

	if (record.output && typeof record.output.text === 'string') {
		return record.output.text;
	}

	if (typeof record.item?.output === 'string') {
		return record.item.output;
	}

	if (record.item?.output && typeof record.item.output === 'object' && record.item.output.text) {
		return record.item.output.text;
	}

	return JSON.stringify(payload);
}

/**
 * Updates the live board as evidence arrives. It does not join-and-wait
 * for every specialist to finish.
 */
export function createSynthesizer(runtime: ClaimswarmRuntime) {
	return createHuman({
		name: 'Synthesizer',
		capabilities: ['board', 'listen:function_call.completed'],
		handlers: [
			{
				specification: new WhenFunctionCallStarted(),
				processor: {
					apply({event}: SituationContext) {
						const state = runtime.resolveRuntime().state;
						const payload = event.payload as {call?: FunctionCallItem};
						const producer = runtime.resolveParticipant(event.producerId).getManifest().name;
						state.log(
							'board.noticed',
							'Synthesizer',
							`${producer} called ${payload.call?.name ?? 'tool'} — board opening a slot`,
						);
					},
				},
			},
			{
				specification: new WhenFunctionCallCompleted(),
				processor: {
					apply({event}: SituationContext) {
						const state = runtime.resolveRuntime().state;
						const producer = runtime.resolveParticipant(event.producerId).getManifest().name;
						const raw = toolOutputText(event.payload);
						let excerpt = raw.slice(0, 220);
						let source = 'function_call.completed';
						let stance: Stance = 'context';
						try {
							const parsed = JSON.parse(raw) as {
								hits?: Array<{source?: string; excerpt?: string; stance?: string}>;
							};
							const hit = parsed.hits?.[0];
							if (hit) {
								source = hit.source ?? source;
								excerpt = hit.excerpt ?? excerpt;
								stance = asStance(hit.stance);
							}
						} catch {
							// Keep the raw tool output on the board.
						}

						state.addEvidence({
							at: state.now(),
							agent: producer,
							stance,
							source,
							excerpt,
						});
						state.log('board.updated', 'Synthesizer', `${producer} evidence: ${source}`);
					},
				},
			},
			{
				specification: new WhenModelAnswers(),
				processor: {
					apply({event}: SituationContext) {
						const state = runtime.resolveRuntime().state;
						const producer = runtime.resolveParticipant(event.producerId).getManifest().name;
						const payload = event.payload as {answer?: ModelMessageItem};
						const text = payload.answer?.content?.text ?? '';
						if (text) {
							state.addAnswer(producer, text);
							state.log('board.answer', 'Synthesizer', `${producer}: ${text.slice(0, 160)}`);
						}
					},
				},
			},
		],
	});
}
