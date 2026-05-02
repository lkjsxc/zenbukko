import process from 'node:process';
import { checkLineLimits } from '../src/development/lineLimits.js';

const violations = await checkLineLimits({
  root: process.cwd(),
  docsLimit: 300,
  sourceLimit: 200,
});

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`${v.file}: ${v.lines} lines exceeds ${v.kind} limit ${v.limit}`);
  }
  process.exitCode = 1;
}
