import {
	Agent,
	type InferenceInput,
	type SituationContext,
	createAgent,
} from '@mozaik-ai/core';
import {createPolicyInterceptor} from '../interception.js';
import {type ClaimswarmRuntime} from '../runtime.js';
import {WhenIJoined, WhenOthersSendAMessage} from '../situations.js';
import {investigationTools} from '../tools.js';

export type SpecialistRole = 'steelman' | 'redteam' | 'contextualist' | 'auditor';

const INSTRUCTIONS: Record<SpecialistRole, string> = {
	steelman: `ROLE:steelman
You are Steelman. Argue the strongest case that the user's claim is true.
Use cite_evidence before you conclude. Never invent studies.
Keep structured context in mind: you emit function calls, then a model message.
Do not declare the claim settled.`,
	redteam: `ROLE:redteam
You are Redteam. Argue the strongest case that the user's claim is false or overstated.
Use cite_evidence before you conclude. Never invent studies.
Compete with Steelman; do not wait for anyone else to finish.`,
	contextualist: `ROLE:contextualist
You are Contextualist. Test whether the claim is the wrong unit of analysis (occupation, era, measurement).
Use cite_evidence. Do not wait for Steelman or Redteam.`,
	auditor: `ROLE:auditor
You are Auditor, a reserve investigator. You join when another participant leaves.
Continue the live investigation using cite_evidence. Do not settle.`,
};

function startLoop(
	runtime: ClaimswarmRuntime,
	participant: Agent,
	message: string,
): void {
	const inferenceInput: InferenceInput = {
		model: 'gpt-5.4-mini',
		context: participant.getMemory().getContext(),
		tools: participant.getTools(),
		streaming: false,
	};
	runtime.runLoop(
		participant.getId(),
		message,
		inferenceInput,
		createPolicyInterceptor(inferenceInput),
	);
}

export function createSpecialist(runtime: ClaimswarmRuntime, role: SpecialistRole) {
	const titles: Record<SpecialistRole, string> = {
		steelman: 'Steelman',
		redteam: 'Redteam',
		contextualist: 'Contextualist',
		auditor: 'Auditor',
	};

	return createAgent({
		name: titles[role],
		capabilities: ['inference', `hypothesis:${role}`],
		instruction: INSTRUCTIONS[role],
		tools: investigationTools,
		handlers: [
			{
				specification: new WhenOthersSendAMessage(),
				processor: {
					apply({event, participant}: SituationContext) {
						if (!(participant instanceof Agent)) {
							return;
						}

						const {message} = event.payload as {message: string};
						startLoop(runtime, participant, message);
					},
				},
			},
			{
				specification: new WhenIJoined(),
				processor: {
					apply({participant}: SituationContext) {
						if (!(participant instanceof Agent)) {
							return;
						}

						const claim = runtime.resolveRuntime().state.claim;
						if (!claim) {
							return;
						}

						startLoop(runtime, participant, `Reassigned mid-run. Continue investigating: ${claim}`);
					},
				},
			},
		],
	});
}
