import {
	type ExecutableTransition,
	type InferenceInput,
	type InterceptionHandler,
	type ModelMessageItem,
} from '@mozaik-ai/core';

const RISKY_PHRASES = [
	'settled',
	'proven beyond doubt',
	'case closed',
	'100% certain',
	'no remaining uncertainty',
];

export function isOverconfidentText(text: string): boolean {
	const lower = text.toLowerCase();
	return RISKY_PHRASES.some(phrase => lower.includes(phrase));
}

function answerText(transition: ExecutableTransition): string {
	if (transition.nextStateId !== 'model_message') {
		return '';
	}

	const {answer} = transition.input as {answer: ModelMessageItem};
	return answer.content?.text ?? '';
}

/**
 * Mid-loop policy participant: rewrite an overconfident model_message
 * back to message_received so the agent must infer again.
 * This is a real InterceptionHandler, not a comment.
 */
export function createPolicyInterceptor(inferenceInput: InferenceInput): InterceptionHandler {
	let intercepted = false;

	return {
		isSatisfiedBy(transition: ExecutableTransition): boolean {
			if (intercepted || transition.nextStateId !== 'model_message') {
				return false;
			}

			return isOverconfidentText(answerText(transition));
		},
		async handle(transition: ExecutableTransition): Promise<ExecutableTransition> {
			intercepted = true;
			const blocked = answerText(transition);
			return {
				nextStateId: 'message_received',
				input: {
					content: [
						'Sentry intercepted an overconfident settlement before it became the answer.',
						'Do not declare the claim settled, proven beyond doubt, or 100% certain.',
						'Write a cautious synthesis that keeps competing hypotheses open.',
						`Blocked text: ${blocked}`,
					].join(' '),
					input: inferenceInput,
				},
			};
		},
	};
}
