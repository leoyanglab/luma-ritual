import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
for(const path of ['public/app.js','public/catalog.js','src/worker.js'])execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
for(const path of ['public/index.html','public/style.css','public/assets/icon.svg','migrations/0001_init.sql'])if(!existsSync(path))throw new Error('Missing '+path);
const html=readFileSync('public/index.html','utf8');if(!html.includes('viewport')||!html.includes('app.js'))throw new Error('HTML entry incomplete');
console.log('All JavaScript syntax and asset checks passed.');
