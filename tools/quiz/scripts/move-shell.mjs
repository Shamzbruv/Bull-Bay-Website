// After `vite build`: move the page itself out of the platform's public
// folder. Anything left in public/ is served to anyone, so the HTML page has
// to be handed out by the platform's route handler instead, which checks the
// visitor is a church admin (players' phone buzzer pages excepted).
import { mkdirSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const built = resolve(here, '../../../public/tools/quiz/index.html');
const shell = resolve(here, '../dist-shell/index.html');

mkdirSync(dirname(shell), { recursive: true });
renameSync(built, shell);
console.log('Quiz page moved out of public/ to', shell);
