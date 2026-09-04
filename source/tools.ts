import {type Tool} from '@mozaik-ai/core';
import {searchCorpus} from './corpus.js';
import {type Stance} from './state.js';

function asStance(value: unknown): Stance | undefined {
	if (value === 'support' || value === 'refute' || value === 'context') {
		return value;
	}

	return undefined;
}

export const investigationTools: Tool[] = [
	{
		type: 'function',
		name: 'cite_evidence',
		description:
			'Search the local evidence corpus and return matching public findings. Use this before arguing.',
		strict: true,
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'Keywords to search (productivity, Ctrip, meetings, occupation, …)',
				},
				stance: {
					type: 'string',
					enum: ['support', 'refute', 'context'],
					description: 'Optional filter for the hypothesis this agent is testing',
				},
			},
			required: ['query'],
			additionalProperties: false,
		},
		invoke: async (args: {query: string; stance?: string}) => {
			const stance = asStance(args.stance);
			const matches = searchCorpus(args.query, stance);
			const hits = matches.length > 0 ? matches : searchCorpus(args.query);
			return {
				query: args.query,
				count: hits.length,
				hits: hits.map(record => ({
					id: record.id,
					stance: record.stance,
					source: record.source,
					excerpt: record.excerpt,
				})),
			};
		},
	},
	{
		type: 'function',
		name: 'publish_verdict',
		description:
			'Publish a final verdict on the claim. Only use when competing evidence has been weighed. Overconfident verdicts are intercepted.',
		strict: true,
		parameters: {
			type: 'object',
			properties: {
				verdict: {type: 'string', description: 'One-sentence verdict'},
				confidence: {type: 'number', description: '0–1 confidence'},
			},
			required: ['verdict', 'confidence'],
			additionalProperties: false,
		},
		invoke: async (args: {verdict: string; confidence: number}) => {
			return {
				published: true,
				verdict: args.verdict,
				confidence: args.confidence,
			};
		},
	},
];
