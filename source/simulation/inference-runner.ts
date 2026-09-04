import {
	DeveloperMessageItem,
	FunctionCallItem,
	FunctionCallOutputItem,
	type InferenceInput,
	type InferenceOutput,
	type InferenceRunner,
	ModelMessageItem,
	type SemanticEvent,
	UserMessageItem,
} from '@mozaik-ai/core';

export type SimulatedTurn = {
	delayMs: number;
	kind: 'function_call' | 'model_message';
	name?: string;
	args?: Record<string, unknown>;
	text?: string;
};

const ROLE_DELAY: Record<string, number> = {
	steelman: 25,
	redteam: 55,
	contextualist: 85,
	auditor: 40,
};

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

function roleFromContext(input: InferenceInput): string {
	for (const item of input.context.getItems()) {
		if (item instanceof DeveloperMessageItem) {
			const match = /ROLE:(\w+)/.exec(item.content.text);
			if (match?.[1]) {
				return match[1];
			}
		}
	}

	return 'unknown';
}

function lastUserText(input: InferenceInput): string {
	const users = input.context.getItems().filter(item => item instanceof UserMessageItem);
	const last = users.at(-1);
	return last instanceof UserMessageItem ? last.content.text : '';
}

function functionCallCount(input: InferenceInput): number {
	return input.context.getItems().filter(item => item instanceof FunctionCallItem).length;
}

function hasFunctionOutput(input: InferenceInput): boolean {
	return input.context.getItems().some(item => item instanceof FunctionCallOutputItem);
}

function hasSentryCorrection(input: InferenceInput): boolean {
	return input.context
		.getItems()
		.some(
			item =>
				item instanceof UserMessageItem &&
				item.content.text.toLowerCase().includes('sentry intercepted'),
		);
}

/**
 * Scripted runner so reviewers can see real runLoop concurrency without OPENAI_API_KEY.
 * It still returns structured ContextItems (function_call / model_message), not raw strings.
 */
export class SimulatedInferenceRunner implements InferenceRunner {
	async run(request: InferenceInput): Promise<InferenceOutput> {
		const turn = this.plan(request);
		await sleep(turn.delayMs);
		return this.materialize(turn);
	}

	async *stream(_request: InferenceInput): AsyncGenerator<SemanticEvent> {
		throw new Error('SimulatedInferenceRunner does not stream; set streaming: false');
	}

	plan(request: InferenceInput): SimulatedTurn {
		const role = roleFromContext(request);
		const delayMs = ROLE_DELAY[role] ?? 35;
		const user = lastUserText(request).toLowerCase();
		const calls = functionCallCount(request);

		if (!hasFunctionOutput(request) || calls === 0) {
			const stance =
				role === 'redteam' ? 'refute' : role === 'contextualist' || role === 'auditor' ? 'context' : 'support';
			return {
				delayMs,
				kind: 'function_call',
				name: 'cite_evidence',
				args: {
					query: user.includes('ctrip') ? 'Ctrip Bloom 2015' : 'remote work productivity',
					stance,
				},
			};
		}

		if (!hasSentryCorrection(request) && role === 'steelman') {
			return {
				delayMs,
				kind: 'model_message',
				text: 'SETTLED: remote work is proven beyond doubt to raise productivity for every knowledge worker. Case closed.',
			};
		}

		const byRole: Record<string, string> = {
			steelman:
				'Support remains: Bloom et al. 2015 (Ctrip) measured a 13.5% output gain. That is one RCT, not a universal law.',
			redteam:
				'Refute remains: Gibbs et al. and Microsoft WTI show longer days, more meetings, and lower output per hour in knowledge-work settings.',
			contextualist:
				'Context: Barrero/Bloom/Davis show WFH effects split by occupation. An all-workers permanent-decline claim is the wrong unit of analysis.',
			auditor:
				'Reassigned auditor: the live board already has competing hits. I will not settle; I will keep both Ctrip gains and collaboration-cost losses in view.',
		};

		return {
			delayMs,
			kind: 'model_message',
			text: byRole[role] ?? 'Competing hypotheses remain open.',
		};
	}

	private materialize(turn: SimulatedTurn): InferenceOutput {
		if (turn.kind === 'function_call' && turn.name && turn.args) {
			return {
				items: [
					FunctionCallItem.rehydrate({
						callId: crypto.randomUUID(),
						name: turn.name,
						args: JSON.stringify(turn.args),
					}),
				],
				tokenUsage: undefined,
				rowResponse: {simulated: true, turn},
			};
		}

		return {
			items: [ModelMessageItem.rehydrate({text: turn.text ?? ''})],
			tokenUsage: undefined,
			rowResponse: {simulated: true, turn},
		};
	}
}
