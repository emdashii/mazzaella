// Headless Chromium for page tests, driven over the DevTools protocol with no
// npm dependencies. buildSite() renders the Hugo site into a temp folder;
// openBrowser() serves that folder to the page by intercepting requests to
// http://site.test/, so no web server runs. Requests anywhere else fail,
// which keeps the tests offline (no analytics, no comments widget).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, extname, join, resolve } from 'node:path';

export const ORIGIN = 'http://site.test';
const ROOT = resolve(import.meta.dirname, '..');

function onPath(names) {
	for (const dir of (process.env.PATH || '').split(delimiter)) {
		for (const n of names) if (dir && existsSync(join(dir, n))) return join(dir, n);
	}
	return null;
}

// Why a browser test cannot run here, or null when it can.
export function missingTools() {
	if (!findChromium()) return 'no Chromium found (set CHROMIUM to its path)';
	if (!onPath(['hugo'])) return 'hugo is not on PATH';
	if (!existsSync(join(ROOT, 'themes/hugo-texify3/layouts'))) return 'theme missing (git submodule update --init)';
	if (!existsSync(join(ROOT, 'node_modules/.bin/postcss'))) return 'PostCSS missing (npm ci)';
	return null;
}

function findChromium() {
	if (process.env.CHROMIUM) return process.env.CHROMIUM;
	return onPath(['chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome']);
}

export function buildSite() {
	const dest = mkdtempSync(join(tmpdir(), 'site-'));
	const r = spawnSync('hugo', ['--logLevel', 'error', '--baseURL', `${ORIGIN}/`, '--destination', dest], { cwd: ROOT, encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`hugo failed: ${r.stderr || r.stdout}`);
	return { dir: dest, remove: () => rmSync(dest, { recursive: true, force: true }) };
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml' };

function serve(siteDir, url) {
	const u = new URL(url);
	if (u.origin !== ORIGIN) return null;
	let file = join(siteDir, decodeURIComponent(u.pathname));
	if (!file.startsWith(siteDir)) return null;
	if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
	if (!existsSync(file)) return null;
	return { body: readFileSync(file), type: TYPES[extname(file)] || 'application/octet-stream' };
}

export async function openBrowser(siteDir) {
	const profile = mkdtempSync(join(tmpdir(), 'chromium-'));
	const proc = spawn(findChromium(), ['--headless=new', '--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
	const exited = new Promise(r => proc.once('exit', r));
	const toBrowser = proc.stdio[3];
	const fromBrowser = proc.stdio[4];

	let nextId = 1;
	const pending = new Map();
	const listeners = new Set();
	let buffer = '';
	fromBrowser.on('data', chunk => {
		buffer += chunk.toString('utf8');
		let end;
		while ((end = buffer.indexOf('\0')) >= 0) {
			const msg = JSON.parse(buffer.slice(0, end));
			buffer = buffer.slice(end + 1);
			if (msg.id && pending.has(msg.id)) {
				const { ok, fail } = pending.get(msg.id);
				pending.delete(msg.id);
				msg.error ? fail(new Error(`${msg.error.message} ${msg.error.data || ''}`)) : ok(msg.result);
			} else for (const l of listeners) l(msg);
		}
	});
	const send = (method, params = {}, sessionId) =>
		new Promise((ok, fail) => {
			const id = nextId++;
			pending.set(id, { ok, fail });
			toBrowser.write(JSON.stringify({ id, method, params, sessionId }) + '\0');
		});

	const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
	const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
	const page = (method, params) => send(method, params, sessionId);
	const waitFor = (method, timeout = 10000) =>
		new Promise((ok, fail) => {
			const timer = setTimeout(() => (listeners.delete(l), fail(new Error(`timed out waiting for ${method}`))), timeout);
			const l = msg => {
				if (msg.sessionId === sessionId && msg.method === method) {
					clearTimeout(timer);
					listeners.delete(l);
					ok(msg.params);
				}
			};
			listeners.add(l);
		});

	listeners.add(msg => {
		if (msg.sessionId !== sessionId || msg.method !== 'Fetch.requestPaused') return;
		const { requestId, request } = msg.params;
		const hit = serve(siteDir, request.url);
		if (!hit) page('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {});
		else page('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: hit.type }], body: hit.body.toString('base64') }).catch(() => {});
	});
	await page('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
	await page('Page.enable');
	await page('Runtime.enable');

	const errors = [];
	listeners.add(msg => {
		if (msg.sessionId === sessionId && msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
	});

	const api = {
		errors,
		async viewport(width, height) {
			await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
		},
		// Always a fresh load, even when only the #hash differs.
		async goto(path) {
			for (const url of ['about:blank', ORIGIN + path]) {
				const loaded = waitFor('Page.loadEventFired');
				await page('Page.navigate', { url });
				await loaded;
			}
		},
		// Runs fn(...args) in the page and returns its (JSON) result.
		async run(fn, ...args) {
			const r = await page('Runtime.evaluate', { expression: `(${fn})(...${JSON.stringify(args)})`, awaitPromise: true, returnByValue: true });
			if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
			return r.result.value;
		},
		async key(key, code = key, keyCode = { Tab: 9, Enter: 13, ' ': 32 }[key]) {
			const base = { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
			await page('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
			if (key === 'Enter') await page('Input.dispatchKeyEvent', { type: 'char', text: '\r', ...base });
			await page('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
		},
		// Types into the focused element as a person would, firing input events.
		async type(text) {
			await page('Input.insertText', { text });
		},
		async screenshot() {
			const { data } = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
			return Buffer.from(data, 'base64');
		},
		async fullScreenshot() {
			const { data } = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
			return Buffer.from(data, 'base64');
		},
		async close() {
			// The reply may never arrive: the browser exits instead.
			send('Browser.close').catch(() => {});
			await Promise.race([exited, new Promise(r => setTimeout(r, 5000))]);
			if (proc.exitCode === null) proc.kill('SIGKILL');
			rmSync(profile, { recursive: true, force: true });
		},
	};
	return api;
}
