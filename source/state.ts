import {RuntimeState} from '@mozaik-ai/core';

export type Stance = 'support' | 'refute' | 'context';

export type EvidenceRow = {
	at: string;
	agent: string;
	stance: Stance;
	source: string;
	excerpt: string;
};

export type SentryFlag = {
	at: string;
	reason: string;
	sourceEvent: string;
	producer: string;
};

export type SwarmEvent = {
	at: string;
	ms: number;
	type: string;
	producer: string;
	detail: string;
};

export class ClaimswarmState extends RuntimeState {
	claim = '';
	mode: 'sim' | 'live' = 'sim';
	startedAt = Date.now();
	evidence: EvidenceRow[] = [];
	sentryFlags: SentryFlag[] = [];
	answers: Array<{at: string; agent: string; text: string}> = [];
	eventLog: SwarmEvent[] = [];
	roster: string[] = [];
	reserveJoined = false;
	listeners = new Set<() => void>();

	now(): string {
		return new Date().toISOString();
	}

	elapsed(): number {
		return Date.now() - this.startedAt;
	}

	log(type: string, producer: string, detail: string): SwarmEvent {
		const entry: SwarmEvent = {
			at: this.now(),
			ms: this.elapsed(),
			type,
			producer,
			detail,
		};
		this.eventLog.push(entry);
		this.notify();
		return entry;
	}

	setClaim(claim: string): void {
		this.claim = claim;
		this.notify();
	}

	addEvidence(row: EvidenceRow): void {
		this.evidence.push(row);
		this.notify();
	}

	addSentryFlag(flag: SentryFlag): void {
		this.sentryFlags.push(flag);
		this.notify();
	}

	addAnswer(agent: string, text: string): void {
		this.answers.push({at: this.now(), agent, text});
		this.notify();
	}

	addRoster(name: string): void {
		if (!this.roster.includes(name)) {
			this.roster.push(name);
			this.notify();
		}
	}

	removeRoster(name: string): void {
		this.roster = this.roster.filter(item => item !== name);
		this.notify();
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private notify(): void {
		for (const listener of this.listeners) {
			listener();
		}
	}
}
