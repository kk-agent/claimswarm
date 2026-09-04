import process from 'node:process';
import {proveOverlap} from './overlap.js';
import {createClaimswarmSession} from './session.js';
import {DEFAULT_CLAIM, MID_RUN_INJECT} from './script.js';

const DEMO_CLAIM = process.argv.slice(2).join(' ').trim() || DEFAULT_CLAIM;

function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
	const started = Date.now();
	return new Promise((resolve, reject) => {
		const tick = () => {
			if (predicate()) {
				resolve();
				return;
			}

			if (Date.now() - started > timeoutMs) {
				reject(new Error('timed out waiting for swarm activity'));
				return;
			}

			setTimeout(tick, 15);
		};

		tick();
	});
}

function printLog(title: string, lines: string[]): void {
	console.log('');
	console.log(`── ${title} ──`);
	for (const line of lines) {
		console.log(line);
	}
}

async function main(): Promise<void> {
	const session = createClaimswarmSession('sim');
	const {state} = session;

	console.log('Claimswarm dry-run (SimulatedInferenceRunner, no API key)');
	console.log(`Claim: ${DEMO_CLAIM}`);
	console.log(`Joined: ${state.roster.join(', ')}`);

	session.send(DEMO_CLAIM);

	await waitFor(
		() => state.eventLog.some(event => event.type === 'function_call.started'),
		2000,
	);

	session.send(MID_RUN_INJECT);
	session.leaveScout();

	await waitFor(() => {
		const overlap = proveOverlap(state.eventLog);
		const sentry = state.eventLog.some(event => event.type === 'sentry.reacted');
		const intercepted = state.eventLog.some(event => event.type === 'interception.started');
		const board = state.evidence.length > 0;
		const answers = state.answers.length >= 2;
		const reserve = state.roster.includes('Auditor');
		return overlap.ok && sentry && intercepted && board && answers && reserve;
	}, 4000);

	const overlap = proveOverlap(state.eventLog);
	printLog(
		'Timestamped event log',
		state.eventLog.map(
			event =>
				`[${event.at}] +${String(event.ms).padStart(4, ' ')}ms  ${event.type.padEnd(24)} ${event.producer.padEnd(14)} ${event.detail}`,
		),
	);
	printLog(
		'Live board (synthesizer, updated as function_call.completed arrived)',
		state.evidence.map(
			row => `• ${row.agent} [${row.stance}] ${row.source} — ${row.excerpt}`,
		),
	);
	printLog(
		'Sentry flags (including mid-loop InterceptionHandler)',
		state.sentryFlags.map(flag => `• ${flag.at} ${flag.sourceEvent} ${flag.producer}: ${flag.reason}`),
	);
	printLog(
		'Model answers after interception',
		state.answers.map(answer => `• ${answer.agent}: ${answer.text}`),
	);

	console.log('');
	console.log('── Overlap proof ──');
	console.log(JSON.stringify(overlap, null, 2));

	if (!overlap.ok) {
		console.error('FAIL: concurrency was not proven.');
		process.exitCode = 1;
		return;
	}

	if (!state.eventLog.some(event => event.type === 'interception.started')) {
		console.error('FAIL: InterceptionHandler never fired.');
		process.exitCode = 1;
		return;
	}

	if (!state.eventLog.some(event => event.type === 'sentry.reacted')) {
		console.error('FAIL: Sentry did not react to function_call.started.');
		process.exitCode = 1;
		return;
	}

	console.log('');
	console.log('PASS: three investigators overlapped, Sentry reacted mid-loop, interceptor aborted a settlement.');
}

await main();
