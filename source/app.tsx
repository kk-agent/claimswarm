import {useEffect, useMemo, useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import TextInput from 'ink-text-input';
import {proveOverlap} from './overlap.js';
import {DEFAULT_CLAIM} from './script.js';
import {createClaimswarmSession, type SwarmMode} from './session.js';
import {type ClaimswarmState, type SwarmEvent} from './state.js';

type AppProps = {
	mode?: SwarmMode;
	initialClaim?: string;
};

function snapshot(state: ClaimswarmState) {
	return {
		claim: state.claim,
		mode: state.mode,
		roster: [...state.roster],
		evidence: [...state.evidence],
		sentryFlags: [...state.sentryFlags],
		answers: [...state.answers],
		eventLog: [...state.eventLog],
	};
}

export default function App({mode, initialClaim}: AppProps) {
	const {exit} = useApp();
	const session = useMemo(() => createClaimswarmSession(mode), [mode]);
	const [view, setView] = useState(() => snapshot(session.state));
	const [input, setInput] = useState('');

	useEffect(() => {
		return session.state.subscribe(() => {
			setView(snapshot(session.state));
		});
	}, [session]);

	useInput((_char, key) => {
		if (key.escape) {
			exit();
		}
	});

	const handleSubmit = (value: string) => {
		const trimmed = value.trim();
		if (!trimmed) {
			return;
		}

		if (trimmed === '/exit' || trimmed === '/quit') {
			exit();
			return;
		}

		if (trimmed === '/leave') {
			session.leaveScout();
			setInput('');
			return;
		}

		setInput('');
		session.send(trimmed);
	};

	const overlap = proveOverlap(view.eventLog);
	const recent = view.eventLog.slice(-12);

	return (
		<Box flexDirection="column" paddingX={1}>
			<Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
				<Text color="cyan" bold>
					CLAIMSWARM
				</Text>
				<Text dimColor>
					{view.mode === 'sim' ? 'dry-run / simulated inference' : 'live OpenAI'} · type a claim ·
					/leave drops Scout · /exit quits
				</Text>
				<Text>
					Roster: {view.roster.join(' · ') || 'joining…'}
				</Text>
				<Text>
					Claim: {view.claim || initialClaim || DEFAULT_CLAIM}
				</Text>
				<Text color={overlap.ok ? 'green' : 'yellow'}>
					Overlap: {overlap.ok ? `YES — ${overlap.reason}` : overlap.reason}
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="row">
				<BoardColumn
					title="Evidence board"
					color="green"
					lines={
						view.evidence.length === 0
							? ['waiting for function_call.completed…']
							: view.evidence.map(
									row => `${row.agent} [${row.stance}] ${row.source}`,
								)
					}
				/>
				<BoardColumn
					title="Sentry"
					color="magenta"
					lines={
						view.sentryFlags.length === 0
							? ['watching function_call.started…']
							: view.sentryFlags.map(flag => flag.reason)
					}
				/>
				<BoardColumn
					title="Answers"
					color="yellow"
					lines={
						view.answers.length === 0
							? ['no model.answer yet']
							: view.answers.map(answer => `${answer.agent}: ${answer.text}`)
					}
				/>
			</Box>

			<Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
				<Text dimColor>Event bus (ISO timestamps)</Text>
				{recent.length === 0 ? (
					<Text dimColor>empty — submit a claim to start concurrent runLoops</Text>
				) : (
					recent.map(event => <EventLine key={`${event.at}-${event.type}-${event.ms}`} event={event} />)
				)}
			</Box>

			<Box marginTop={1}>
				<Text color="cyan">{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={handleSubmit}
					placeholder={view.claim ? 'inject a mid-run message…' : DEFAULT_CLAIM}
				/>
			</Box>
		</Box>
	);
}

function BoardColumn({
	title,
	color,
	lines,
}: {
	title: string;
	color: string;
	lines: string[];
}) {
	return (
		<Box flexDirection="column" width="33%" paddingRight={1}>
			<Text color={color} bold>
				{title}
			</Text>
			{lines.slice(-6).map((line, index) => (
				<Text key={`${title}-${index}`} wrap="truncate">
					{line}
				</Text>
			))}
		</Box>
	);
}

function EventLine({event}: {event: SwarmEvent}) {
	return (
		<Text>
			<Text dimColor>{event.at.slice(11, 23)}</Text>
			<Text> +{String(event.ms).padStart(4, ' ')}ms </Text>
			<Text color="cyan">{event.type}</Text>
			<Text> {event.producer} </Text>
			<Text dimColor>{event.detail}</Text>
		</Text>
	);
}
