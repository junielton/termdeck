#!/usr/bin/env node
// Launcher for termdeck that works no matter the current working directory.
// Ensures Electron is pointed at this package's root (not user CWD) and applies WSL tweaks.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const appRoot = path.resolve(__dirname, '..');
const electronBin = path.join(appRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');

if (!fs.existsSync(electronBin)) {
	console.error('[termdeck] Electron binary not found at', electronBin);
	console.error('[termdeck] Try reinstalling dependencies: npm install (inside the termdeck project).');
	process.exit(1);
}

const isWsl = (() => {
	if (process.platform !== 'linux') return false;
	try { return /microsoft/i.test(fs.readFileSync('/proc/version', 'utf8')); } catch { return false; }
})();

const args = [];
// WSL often needs --no-sandbox; harmless elsewhere if user sets manually, so only add when detected.
if (isWsl) args.push('--no-sandbox');
// Point Electron to package root so it loads our package.json main field regardless of user CWD.
args.push(appRoot);

const child = spawn(electronBin, args, { stdio: 'inherit', env: { ...process.env } });

child.on('error', (err) => {
	console.error('[termdeck] Failed to launch Electron:', err.message);
	process.exit(1);
});

child.on('close', code => process.exit(code ?? 0));
