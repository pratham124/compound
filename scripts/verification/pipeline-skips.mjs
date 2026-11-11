// Prints `test` when the branch only changes docs/tooling, so the run can use `--skip test`.
import { changedFiles, isDocsOnly } from './changed-files.mjs';

const files = changedFiles(process.cwd());
if (files && isDocsOnly(files)) console.log('test');
