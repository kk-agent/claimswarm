import assert from 'node:assert/strict';
import {afterEach, test} from 'node:test';
import {
	type ExecutableTransition,
	FunctionCallItem,
	ModelMessageItem,
	SemanticEvent,
} from '@mozaik-ai/core';
import {createPolicyInterceptor, isOverconfidentText} from '../source/interception.js';
import {proveOverlap} from '../source/overlap.js';
import {DEFAULT_CLAIM, MID_RUN_INJECT} from '../source/script.js';
import {createClaimswarmSession} from '../source/session.js';
import {type ClaimswarmState} from '../source/state.js';

const sessions: Array<{runtime: {resolveRuntime: () => unknown}}> = [];

afterEach(() => {
	sessions.length = 0;
});

function waitFor(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
	const started = Date.now();
	return new Promise((resolve, reject) => {
		const tick = () => {
			if (predicate()) {
				resolve();
				return;
			}

			if (Date.now() - started > timeoutMs) {
				reject(new Error('waitFor timed out'));
				return;
			}

			setTimeout(tick, 10);
		};

		tick();
	});
}

function participantByName(state: ClaimswarmState, name: string) {
	const found = [...state.participants.values()].find(item => item.getManifest().name === name);
	assert.ok(found, `missing participant ${name}`);
	return found;
}

test('three specialists and sentry join the same runtime', () => {
	const session = createClaimswarmSession('sim');
	sessions.push(session);
	const names = [...session.state.participants.values()].map(item => item.getManifest().name);
	for (const expected of ['Steelman', 'Redteam', 'Contextualist', 'Sentry', 'Synthesizer', 'Operator']) {
		assert.ok(names.includes(expected), `expected ${expected} in ${names.join(',')}`);
	}

	assert.notEqual(
		participantByName(session.state, 'Steelman').getMemory().getContext().id,
		participantByName(session.state, 'Redteam').getMemory().getContext().id,
	);
});

test('sentry reacts to function_call.started without waiting for the caller loop', () => {
	const session = createClaimswarmSession('sim');
	sessions.push(session);
	const steelman = participantByName(session.state, 'Steelman');
	session.runtime.sendEvent(
		SemanticEvent.create('function_call.started', steelman.getId(), {
			call: FunctionCallItem.rehydrate({
				callId: 'call-test-1',
				name: 'cite_evidence',
				args: JSON.stringify({query: 'Ctrip', stance: 'support'}),
			}),
		}),
		steelman.getId(),
	);

	assert.ok(
		session.state.eventLog.some(event => event.type === 'sentry.reacted' && event.producer === 'Sentry'),
	);
	assert.ok(session.state.sentryFlags.some(flag => flag.sourceEvent === 'function_call.started'));
	assert.ok(
		session.state.eventLog.some(
			event => event.type === 'board.noticed' && event.producer === 'Synthesizer',
		),
	);
});

test('synthesizer records evidence from function_call.completed', () => {
	const session = createClaimswarmSession('sim');
	sessions.push(session);
	const redteam = participantByName(session.state, 'Redteam');
	const output = JSON.stringify({
		hits: [
			{
				stance: 'refute',
				source: 'Gibbs et al.',
				excerpt: 'Output per hour fell while days got longer.',
			},
		],
	});
	session.runtime.sendEvent(
		SemanticEvent.create('function_call.completed', redteam.getId(), {
			callId: 'call-test-2',
			output: {text: output},
		}),
		redteam.getId(),
	);

	assert.equal(session.state.evidence.length, 1);
	assert.equal(session.state.evidence[0]?.agent, 'Redteam');
	assert.equal(session.state.evidence[0]?.source, 'Gibbs et al.');
	assert.ok(session.state.eventLog.some(event => event.type === 'board.updated'));
});

test('InterceptionHandler aborts an overconfident model_message', async () => {
	assert.equal(isOverconfidentText('Settled: proven beyond doubt'), true);
	assert.equal(isOverconfidentText('Competing hypotheses remain open'), false);

	const inferenceInput = {
		model: 'gpt-5.4-mini',
		context: participantByName(createClaimswarmSession('sim').state, 'Steelman')
			.getMemory()
			.getContext(),
		tools: [],
		streaming: false,
	};
	const handler = createPolicyInterceptor(inferenceInput);
	const incoming = {
		nextStateId: 'model_message',
		input: {
			answer: ModelMessageItem.rehydrate({
				text: 'SETTLED: this is proven beyond doubt. Case closed.',
			}),
		},
	} as ExecutableTransition;

	assert.equal(handler.isSatisfiedBy(incoming), true);
	const rewritten = await handler.handle(incoming);
	assert.equal(rewritten.nextStateId, 'message_received');
	if (rewritten.nextStateId !== 'message_received') {
		throw new Error('expected message_received rewrite');
	}

	assert.match(rewritten.input.content, /Sentry intercepted/);
	assert.equal(handler.isSatisfiedBy(incoming), false);
});

test('runLoops overlap, interceptor fires, synthesizer sees completed tool events', async () => {
	const session = createClaimswarmSession('sim');
	sessions.push(session);
	session.send(DEFAULT_CLAIM);

	await waitFor(() => session.state.eventLog.some(event => event.type === 'function_call.started'));
	session.send(MID_RUN_INJECT);
	session.leaveScout();

	await waitFor(() => {
		const overlap = proveOverlap(session.state.eventLog);
		return (
			overlap.ok &&
			session.state.eventLog.some(event => event.type === 'interception.started') &&
			session.state.eventLog.some(event => event.type === 'interception.finished') &&
			session.state.eventLog.some(event => event.type === 'sentry.reacted') &&
			session.state.evidence.length > 0 &&
			session.state.answers.length > 0 &&
			session.state.roster.includes('Auditor')
		);
	}).catch(error => {
		const types = session.state.eventLog.map(event => `${event.ms}:${event.type}:${event.producer}`);
		throw new Error(`${error instanceof Error ? error.message : error}\nlog=${types.join(' | ')}`);
	});

	const overlap = proveOverlap(session.state.eventLog);
	assert.equal(overlap.ok, true, overlap.reason);
	assert.ok(overlap.specialists.length >= 3);
	assert.ok(session.state.eventLog.some(event => event.type === 'function_call.completed'));
	assert.ok(session.state.eventLog.some(event => event.type === 'interception.started'));
	assert.ok(session.state.eventLog.some(event => event.type === 'interception.finished'));
	assert.ok(session.state.answers.length > 0);
	assert.ok(session.state.roster.includes('Auditor'));
	assert.ok(!session.state.roster.includes('Scout'));
});
