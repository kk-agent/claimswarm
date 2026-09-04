import {type Stance} from './state.js';

export type CorpusRecord = {
	id: string;
	stance: Stance;
	source: string;
	year: number;
	excerpt: string;
	keywords: string[];
};

/**
 * Local evidence shelf used by cite_evidence.
 * Records are public, citable findings — not invented studies.
 */
export const EVIDENCE_CORPUS: CorpusRecord[] = [
	{
		id: 'bloom-2015-ctrip',
		stance: 'support',
		source: 'Bloom, Liang, Roberts, Ying — QJE 2015, Ctrip WFH experiment',
		year: 2015,
		excerpt:
			'A nine-month randomized experiment at Ctrip found that home workers completed 13.5% more calls, with 9% from more minutes worked and 4% from more calls per minute.',
		keywords: ['ctrip', 'bloom', 'wfh', 'remote', 'productivity', 'call center', '2015'],
	},
	{
		id: 'bloom-2024-hybrid',
		stance: 'context',
		source: 'Bloom et al. — hybrid WFH reviews and follow-up field work (2022–2024)',
		year: 2024,
		excerpt:
			'Later hybrid trials show smaller, occupation-specific effects. Two-to-three office days often preserve coordination without erasing the Ctrip-style individual output gain.',
		keywords: ['hybrid', 'bloom', 'coordination', 'office days', 'occupation'],
	},
	{
		id: 'microsoft-wti',
		stance: 'refute',
		source: 'Microsoft Work Trend Index (2023) — collaboration load',
		year: 2023,
		excerpt:
			'Knowledge-work telemetry showed more meetings, chats, and after-hours pings after the shift to remote/hybrid. Collaboration overhead can erase individual throughput gains.',
		keywords: ['microsoft', 'meetings', 'collaboration', 'overhead', 'knowledge'],
	},
	{
		id: 'gibbs-2022-self-report',
		stance: 'refute',
		source: 'Gibbs, Mengel, Siemroth — Chicago Booth WFH productivity (2021–2022)',
		year: 2022,
		excerpt:
			'An Indian IT services firm study found employees worked longer days at home but output per hour fell; self-reported productivity overstated the actual change.',
		keywords: ['it', 'hours', 'output per hour', 'self-report', 'gibbs'],
	},
	{
		id: 'occupation-mix',
		stance: 'context',
		source: 'Barrero, Bloom, Davis — Survey of Working Arrangements and Attitudes',
		year: 2023,
		excerpt:
			'WFH incidence and reported productivity vary sharply by occupation, childcare, and commute. An all-workers permanent-decline claim averages incompatible jobs into one number.',
		keywords: ['occupation', 'survey', 'all workers', 'permanent', 'average'],
	},
];

export function searchCorpus(query: string, stance?: Stance): CorpusRecord[] {
	const tokens = query.toLowerCase().split(/\W+/).filter(Boolean);
	return EVIDENCE_CORPUS.filter(record => {
		if (stance && record.stance !== stance) {
			return false;
		}

		if (tokens.length === 0) {
			return true;
		}

		const haystack = `${record.source} ${record.excerpt} ${record.keywords.join(' ')}`.toLowerCase();
		return tokens.some(token => haystack.includes(token) || record.keywords.includes(token));
	});
}
