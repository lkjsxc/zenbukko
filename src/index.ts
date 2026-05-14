#!/usr/bin/env node

import { Command } from 'commander';
import { registerBasicCommands } from './cli/basicCommands.js';
import { registerDownloadCommands } from './cli/downloadCommands.js';
import { registerServerCommands } from './cli/serverCommands.js';

const program = new Command();

program.name('zenbukko').description('Local course archive and transcription toolkit');
program
  .option('--session <path>', 'Session file path override')
  .option('--output <path>', 'Output directory override')
  .option('--headless', 'Run Puppeteer in headless mode')
  .option('--log-level <level>', 'silent|error|warn|info|debug');

registerBasicCommands(program);
registerDownloadCommands(program);
registerServerCommands(program);

await program.parseAsync(process.argv);
