#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';
import {type SwarmMode} from './session.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({
	quiet: true,
	path: [
		path.resolve(process.cwd(), '.env'),
		path.resolve(here, '..', '.env'),
	],
});

const cli = meow(
	`
	Usage
	  $ claimswarm
	  $ claimswarm --sim
	  $ claimswarm --live

	Interactive ops room. Several specialists join() one runtime and run at the same time.

	--sim   Force SimulatedInferenceRunner (no API key)
	--live  Force OpenAI (requires OPENAI_API_KEY)

	Headless concurrency demo (no TUI):
	  $ npm run demo
`,
	{
		importMeta: import.meta,
		flags: {
			sim: {type: 'boolean', default: false},
			live: {type: 'boolean', default: false},
		},
	},
);

const mode: SwarmMode | undefined = cli.flags.live ? 'live' : cli.flags.sim ? 'sim' : undefined;

render(<App mode={mode} />);
