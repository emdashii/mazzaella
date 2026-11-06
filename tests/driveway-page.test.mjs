// Drives the built driveway clearance page in headless Chromium.
// Skips (with the reason) when Chromium or Hugo is missing.
// Run with: node --test tests/
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite, missingTools, openBrowser } from './browser.mjs';

const PAGE = '/posts/driveway-clearance/';
const skip = missingTools();

// What the visitor can currently read and reach in the results area.
function snapshot() {
	// The scene: everything from the headline down to the share button.
	const out = document.getElementById('dc-scene').closest('#dc-output') || document.getElementById('dc-scene');
	const rows = [...document.querySelectorAll('#dc-results tr')];
	return {
		error: document.getElementById('dc-error').textContent,
		headline: document.getElementById('dc-headline').textContent,
		rows: rows.map(r => r.className),
		inert: out.inert,
		visibility: getComputedStyle(out).visibility,
		playLabel: document.getElementById('dc-play').textContent,
		hash: location.hash,
	};
}

// Sets an input's value the way typing does: clear it, insert text, so the
// browser sanitises it and fires real input events.
async function typeInto(b, selector, text) {
	await b.run(s => {
		const el = document.querySelector(s);
		el.focus();
		if (document.activeElement !== el) throw new Error(`${s} cannot take focus`);
		el.value = '';
		el.dispatchEvent(new Event('input', { bubbles: true }));
	}, selector);
	if (text !== '') await b.type(text);
}

const answerShown = s => {
	assert.equal(s.error, '');
	assert.notEqual(s.headline, '');
	assert.equal(s.rows.length, 2);
	assert.equal(s.inert, false);
	assert.equal(s.visibility, 'visible');
};

const answerWithdrawn = (s, error) => {
	assert.match(s.error, error);
	assert.equal(s.headline, '');
	assert.equal(s.rows.length, 0);
	assert.equal(s.inert, true, 'result controls must be out of reach');
	assert.equal(s.visibility, 'hidden', 'old drawing and chart must not show');
	assert.equal(s.playLabel, 'drive');
};

describe('driveway clearance page', { skip: skip ?? false }, () => {
	let site;
	let b;
	before(async () => {
		site = buildSite();
		b = await openBrowser(site.dir);
		await b.viewport(1440, 900);
	});
	after(async () => {
		await b?.close();
		site?.remove();
	});
	// Loads the page with the driveway editor open, as someone editing it has.
	const load = async (hash = '') => {
		await b.goto(PAGE + hash);
		await b.run(() => (document.querySelector('.dc details').open = true));
	};

	test('loads without script errors and shows an answer', async () => {
		await load();
		answerShown(await b.run(snapshot));
		assert.deepEqual(b.errors, []);
	});

	describe('an invalid driveway profile withdraws the answer until it is fixed', () => {
		const firstDistance = '#dc-profile-body tr:nth-child(1) input';
		const secondDistance = '#dc-profile-body tr:nth-child(2) input';
		const cases = [
			['blank cell', firstDistance, '', /every driveway cell needs a number/],
			['text that is not a number', firstDistance, 'abc', /every driveway cell needs a number/],
			['two points at the same distance', secondDistance, '-4', /share the same distance/],
		];
		for (const [name, selector, text, error] of cases) {
			test(name, async () => {
				await load();
				const before = await b.run(snapshot);
				const original = await b.run(s => document.querySelector(s).value, selector);
				// Start the drive so withdrawing the answer must also stop it.
				await b.run(() => document.getElementById('dc-play').click());
				await typeInto(b, selector, text);
				const bad = await b.run(snapshot);
				answerWithdrawn(bad, error);
				assert.equal(bad.hash, before.hash, 'the share link must keep the last real answer');
				if (text !== '-4') assert.equal(await b.run(s => document.querySelector(s).getAttribute('aria-invalid'), selector), 'true');
				// The slider no longer moves once the drive is stopped.
				const pos = await b.run(() => document.getElementById('dc-position').value);
				await b.run(() => new Promise(r => setTimeout(r, 150)));
				assert.equal(await b.run(() => document.getElementById('dc-position').value), pos);

				// Editing the car meanwhile must not bring back an answer for the old profile.
				await typeInto(b, '#dc-wheelbase', '110');
				answerWithdrawn(await b.run(snapshot), error);

				await typeInto(b, selector, original);
				const fixed = await b.run(snapshot);
				answerShown(fixed);
				assert.equal(await b.run(() => document.getElementById('dc-wheelbase').value), '110', 'typed values stay');
				assert.equal(await b.run(s => document.querySelector(s).hasAttribute('aria-invalid'), selector), false);
			});
		}

		test('add row keeps a half-typed table', async () => {
			await load();
			await typeInto(b, firstDistance, '');
			const rows = await b.run(() => document.querySelectorAll('#dc-profile-body tr').length);
			await b.run(() => document.getElementById('dc-add-row').click());
			assert.equal(await b.run(() => document.querySelectorAll('#dc-profile-body tr').length), rows + 1);
			assert.equal(await b.run(s => document.querySelector(s).value, firstDistance), '');
			answerWithdrawn(await b.run(snapshot), /every driveway cell needs a number/);
			await b.run(() => document.getElementById('dc-reset-driveway').click());
			answerShown(await b.run(snapshot));
		});
	});

	test('an invalid car withdraws the answer until it is fixed', async () => {
		await load();
		for (const [value, error] of [['', /every car measurement needs a number/], ['400', /longer than this tool handles/]]) {
			await typeInto(b, '#dc-wheelbase', value);
			answerWithdrawn(await b.run(snapshot), error);
			if (value === '') assert.equal(await b.run(() => document.getElementById('dc-wheelbase').getAttribute('aria-invalid')), 'true');
			await typeInto(b, '#dc-wheelbase', '111');
			answerShown(await b.run(snapshot));
		}
	});

	test('a chart pointer leaving after invalidation cannot redraw the old answer', async () => {
		await load();
		await typeInto(b, '#dc-wheelbase', '');
		answerWithdrawn(await b.run(snapshot), /every car measurement needs a number/);
		// Hiding the chart can deliver a final pointerleave after the analysis
		// has been cleared. It must not try to read the discarded sweeps.
		await b.run(() => document.getElementById('dc-chart').dispatchEvent(new PointerEvent('pointerleave')));
		assert.deepEqual(b.errors, []);
		await typeInto(b, '#dc-wheelbase', '111');
		answerShown(await b.run(snapshot));
	});

	test('the safety margin on screen is the one both rows use', async () => {
		// Full-size pickup: both directions have about 1.8 in to spare.
		await load('#car=145,32,38,52,12,20,9.5');
		const steps = [
			['1', ['dc-clear', 'dc-clear'], ''],
			['', null, ''],
			['-1', null, ''],
			['0', ['dc-clear', 'dc-clear'], '&m=0'],
			['2', ['dc-tight', 'dc-tight'], '&m=2'],
		];
		for (const [value, rows, hash] of steps) {
			await typeInto(b, '#dc-margin', value);
			const s = await b.run(snapshot);
			assert.equal(await b.run(() => document.getElementById('dc-margin').value), value, 'typed value stays');
			if (rows) {
				answerShown(s);
				assert.deepEqual(s.rows, rows, `margin ${value}`);
				assert.ok(s.hash.endsWith(hash || '9.5'), `margin ${value}: ${s.hash}`);
			} else {
				answerWithdrawn(s, /safety margin needs a number/);
				assert.equal(await b.run(() => document.getElementById('dc-margin').getAttribute('aria-invalid')), 'true');
			}
		}
	});

	describe('the headline agrees with both verdict rows', () => {
		// One profile where the front bumper meets a dip; swapping the car's
		// front and rear swaps which direction is worse. Raising every height
		// by 1.2 in lifts both gaps. Margins pick the verdicts.
		const dw = 'dw=-48:0,0:0,48:-8.6,84:-16.2,108:-12.9,156:-18.4';
		const base = '108,26,30,48,6,9,7'; // nose -0.8, tail 1.4
		const raised = '108,26,30,48,7.2,10.2,8.2'; // nose 0.4, tail 2.6
		const low = '108,26,30,48,4.4,7.4,5.4'; // nose -2.4, tail -0.2
		const swapped = '108,26,48,30,9,6,7'; // nose 1.4, tail -0.8
		const swappedRaised = '108,26,48,30,10.2,7.2,8.2'; // nose 2.6, tail 0.4
		const cases = [
			[raised, 0.25, 'clear', 'clear', 'this car makes it, either direction.'],
			[raised, 3, 'tight', 'tight', 'too close to call either way: less than 3.0 in to spare.'],
			[low, 1, 'scrape', 'scrape', 'this car scrapes, whichever way it goes in.'],
			[base, 1, 'scrape', 'clear', 'this car scrapes one way. go in tail first (backing in).'],
			[swapped, 1, 'clear', 'scrape', 'this car scrapes one way. go in nose first (driving in forward).'],
			[base, 2, 'scrape', 'tight', 'this car scrapes nose first, and tail first is too close to call.'],
			[swapped, 2, 'tight', 'scrape', 'this car scrapes tail first, and nose first is too close to call.'],
			[raised, 1, 'tight', 'clear', 'this car makes it tail first. nose first is too close to call: less than 1.0 in to spare.'],
			[swappedRaised, 1, 'clear', 'tight', 'this car makes it nose first. tail first is too close to call: less than 1.0 in to spare.'],
		];
		for (const [car, m, nose, tail, expected] of cases) {
			test(`nose first ${nose}, tail first ${tail}`, async () => {
				await load(`#car=${car}&${dw}&m=${m}`);
				const s = await b.run(snapshot);
				assert.deepEqual(s.rows, [`dc-${nose}`, `dc-${tail}`]);
				assert.equal(s.headline, expected);
			});
		}
	});

	// Every result cell, and the show-me buttons especially, must sit inside
	// the calculator's column; the page must not scroll sideways.
	function layout() {
		const box = document.querySelector('.dc').getBoundingClientRect();
		const inside = el => {
			const r = el.getBoundingClientRect();
			return r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.width > 0;
		};
		const scroller = document.querySelector('.dc-profile-scroll');
		return {
			pageOverflow: document.documentElement.scrollWidth - innerWidth,
			outside: [...document.querySelectorAll('#dc-results th, #dc-results td, #dc-results button, .dc-scene, .dc-chart, #dc-copy, #dc-play, #dc-position')]
				.filter(el => !inside(el))
				.map(el => el.className || el.id || el.tagName),
			editorOverflow: scroller.scrollWidth - scroller.clientWidth,
		};
	}

	for (const [w, h] of [[320, 812], [375, 812], [390, 844], [1440, 900]]) {
		test(`at ${w}px every result and action is inside the page and keyboard-reachable`, async () => {
			await b.viewport(w, h);
			try {
				await load();
				const l = await b.run(layout);
				assert.ok(l.pageOverflow <= 0, `page scrolls sideways by ${l.pageOverflow}px`);
				assert.deepEqual(l.outside, []);
				assert.ok(l.editorOverflow <= 0, `driveway editor scrolls sideways by ${l.editorOverflow}px`);

				// Tab from the safety margin reaches both show-me buttons in order,
				// and Enter on each jumps to that direction's tightest spot.
				// Start on the other direction so the first jump is visible.
				await b.run(() => {
					const r = document.querySelector('input[name="dc-orient"][value="tail-in"]');
					r.checked = true;
					r.dispatchEvent(new Event('change'));
					document.getElementById('dc-margin').focus();
				});
				for (const o of ['nose-in', 'tail-in']) {
					await b.key('Tab');
					const focused = await b.run(() => {
						const el = document.activeElement;
						const r = el.getBoundingClientRect();
						return { o: el.dataset.o, inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
					});
					assert.equal(focused.o, o);
					assert.ok(focused.inView, `${o} show-me button is off screen when focused`);
					// Move away from the tightest spot first, so the jump is visible.
					await b.run(() => {
						const s = document.getElementById('dc-position');
						s.value = 0;
						s.dispatchEvent(new Event('input'));
					});
					await b.key('Enter');
					const after = await b.run(() => ({
						orient: document.querySelector('input[name="dc-orient"]:checked').value,
						pos: +document.getElementById('dc-position').value,
						label: document.getElementById('dc-position-label').textContent,
					}));
					assert.equal(after.orient, o);
					assert.ok(after.pos > 0, `${o}: still at the start`);
					assert.match(after.label, /tightest now: underbody/);
				}

				// The driveway editor scrolls inside its own box; focusing its last
				// cell brings that cell into view with the column headings still
				// showing above it.
				const editor = await b.run(() => {
					const scroller = document.querySelector('.dc-profile-scroll');
					const inputs = scroller.querySelectorAll('input');
					const last = inputs[inputs.length - 1];
					last.focus();
					const sr = scroller.getBoundingClientRect();
					const lr = last.getBoundingClientRect();
					const hr = scroller.querySelector('thead th').getBoundingClientRect();
					return { scrolls: scroller.scrollHeight > scroller.clientHeight, scrollTop: scroller.scrollTop, visible: lr.top >= sr.top && lr.bottom <= sr.bottom && lr.right <= sr.right, headTop: hr.top - sr.top };
				});
				assert.ok(editor.scrolls && editor.scrollTop > 0, JSON.stringify(editor));
				assert.ok(editor.visible, JSON.stringify(editor));
				assert.ok(Math.abs(editor.headTop) < 1, `headings scrolled away: ${editor.headTop}`);
			} finally {
				await b.viewport(1440, 900);
			}
		});
	}
});
