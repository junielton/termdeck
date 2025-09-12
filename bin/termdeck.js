#!/usr/bin/env node
// Launcher for termdeck that works no matter the current working directory.
// Ensures Electron is pointed at this package's root (not user CWD) and applies WSL tweaks.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const appRoot = path.resolve(__dirname, '..');

function dbg(...args) {
	if (process.env.TERMDECK_DEBUG) {
		try { console.error('[termdeck:debug]', ...args); } catch {}
	}
}

// Resolve Electron executable robustly across platforms.
// - On Windows prefer native electron.exe to avoid spawning the .cmd shim (can cause EINVAL)
// - Allow override via TERMDECK_ELECTRON to point to a custom electron binary
function resolveElectronBinary() {
	const override = process.env.TERMDECK_ELECTRON && String(process.env.TERMDECK_ELECTRON).trim();
	if (override && fs.existsSync(override)) return override;

	if (process.platform === 'win32') {
		const exe = path.join(appRoot, 'node_modules', 'electron', 'dist', 'electron.exe');
		if (fs.existsSync(exe)) return exe;
		// Fallback to .cmd if exe not found
		const cmd = path.join(appRoot, 'node_modules', '.bin', 'electron.cmd');
		if (fs.existsSync(cmd)) return cmd;
	} else {
		const bin = path.join(appRoot, 'node_modules', '.bin', 'electron');
		if (fs.existsSync(bin)) return bin;
		// Fallback to package's dist binary if available
		const posixDist = path.join(appRoot, 'node_modules', 'electron', 'dist', 'electron');
		if (fs.existsSync(posixDist)) return posixDist;
	}
	return null;
}

const electronBin = resolveElectronBinary();
if (!electronBin) {
	console.error('[termdeck] Electron binary not found. Looked under node_modules/.bin and electron/dist.');
	console.error('[termdeck] Try reinstalling dependencies: npm install (inside the termdeck project).');
	console.error('[termdeck] Or set TERMDECK_ELECTRON to a valid electron executable path.');
	process.exit(1);
}

// Preflight: ensure package.json main exists to avoid Electron generic error
try {
	const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
	const mainRel = pkg && pkg.main ? String(pkg.main) : 'dist/main/main.js';
	const mainAbs = path.join(appRoot, mainRel);
	if (!fs.existsSync(mainAbs)) {
		console.error('[termdeck] Build artifact missing:', mainAbs);
		console.error('[termdeck] Please run one of the following and try again:');
		console.error('  - npm run build');
		console.error('  - ./scripts/dev-link.sh');
		process.exit(1);
	}
} catch (e) {
	// Continue and let Electron handle if something weird happens
}

const isWsl = (() => {
	if (process.platform !== 'linux') return false;
	try { return /microsoft/i.test(fs.readFileSync('/proc/version', 'utf8')); } catch { return false; }
})();

// Normalize app path for Windows when invoked from WSL contexts
function normalizeAppPathForWin(p) {
	try {
		let out = p;
		// Case 1: POSIX /mnt/c/... -> C:\...
		const mnt = out.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);
		if (mnt) {
			const drive = mnt[1].toUpperCase();
			const rest = mnt[2].replace(/\//g, '\\');
			return drive + ':\\' + rest;
		}
		// Case 2: \\wsl.localhost\\<distro>\\mnt\\c\\... -> C:\...
		const unc = out.match(/^\\\\wsl\.localhost\\[^\\]+\\mnt\\([a-zA-Z])\\(.*)$/);
		if (unc) {
			const drive = unc[1].toUpperCase();
			const rest = unc[2].replace(/\//g, '\\');
			return drive + ':\\' + rest;
		}
		return out;
	} catch {
		return p;
	}
}

const args = [];
// WSL often needs --no-sandbox; harmless elsewhere if user sets manually, so only add when detected.
if (isWsl) args.push('--no-sandbox');
// Point Electron to package root so it loads our package.json main field regardless of user CWD.
let appPath = appRoot;
if (process.platform === 'win32') {
	const fixed = normalizeAppPathForWin(appRoot);
	if (fixed !== appRoot) {
		dbg('Normalized app path for Windows from', appRoot, 'to', fixed);
		appPath = fixed;
	}
}
args.push(appPath);

// On Windows, prefer spawning electron.exe directly. If we only have electron.cmd, use a shell.
const useShell = process.platform === 'win32' && /\.cmd$/i.test(electronBin);
const child = spawn(electronBin, args, { stdio: 'inherit', env: { ...process.env }, shell: useShell, windowsHide: false });

child.on('error', (err) => {
	console.error('[termdeck] Failed to launch Electron:', err.message);
	if (process.platform === 'win32') {
		console.error('[termdeck] Hint: On Windows, spawning electron.cmd can fail. Prefer electron.exe under node_modules/electron/dist/.');
		console.error('[termdeck] You can set TERMDECK_ELECTRON to the full path of electron.exe as a workaround.');
	}
	process.exit(1);
});

child.on('close', code => process.exit(code ?? 0));
