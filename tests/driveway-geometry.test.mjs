// Checks the driveway clearance model against cases with a closed-form answer.
// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const G = require('../static/js/driveway-geometry.js');

const deg = d => (d * Math.PI) / 180;
const car = over => ({
	wheelbase: 108,
	tireDiameter: 0.002, // a point tire, so textbook formulas apply exactly
	frontOverhang: 36,
	rearOverhang: 40,
	frontHeight: 7,
	rearHeight: 11,
	clearance: 5,
	...over,
});

test('flat ground: the lowest point is the lowest input height', () => {
	const r = G.analyze([{ x: 0, y: 0 }, { x: 240, y: 0 }], car({ tireDiameter: 26 }));
	assert.ok(Math.abs(r['nose-in'].worst.clearance - 5) < 1e-6);
	assert.ok(Math.abs(r['tail-in'].worst.clearance - 5) < 1e-6);
});

test('sharp crest: belly clearance matches c - (L/2) tan(angle/2)', () => {
	const a = deg(13);
	// Flat street, then a 13 degree drop that runs well past the wheelbase.
	const pts = [{ x: -100, y: 0 }, { x: 0, y: 0 }, { x: 400 * Math.cos(a), y: -400 * Math.sin(a) }];
	const r = G.analyze(pts, car({ frontHeight: 50, rearHeight: 50 }), 0.25);
	const expected = 5 - 54 * Math.tan(a / 2);
	assert.equal(r['nose-in'].worst.part, 'underbody');
	assert.ok(Math.abs(r['nose-in'].worst.clearance - expected) < 0.05, `${r['nose-in'].worst.clearance} vs ${expected}`);
});

test('sharp sag: bumper clearance matches h - overhang tan(angle)', () => {
	const a = deg(10);
	// Flat, then a 10 degree climb: the leading bumper meets the rise first.
	const pts = [{ x: -100, y: 0 }, { x: 0, y: 0 }, { x: 400 * Math.cos(a), y: 400 * Math.sin(a) }];
	const r = G.analyze(pts, car({ clearance: 50 }), 0.25);
	const nose = r['nose-in'].worst;
	const tail = r['tail-in'].worst;
	assert.equal(nose.part, 'front bumper');
	assert.ok(Math.abs(nose.clearance - (7 - 36 * Math.tan(a))) < 0.05);
	// Backing in, the rear bumper leads (11 - 40 tan a = 3.9) but the front
	// bumper still trails through the same corner (7 - 36 tan a = 0.65).
	assert.equal(tail.part, 'front bumper');
	assert.ok(Math.abs(tail.clearance - nose.clearance) < 0.05);
	const rearOnly = G.analyze(pts, car({ clearance: 50, frontHeight: 50 }), 0.25)['tail-in'].worst;
	assert.equal(rearOnly.part, 'rear bumper');
	assert.ok(Math.abs(rearOnly.clearance - (11 - 40 * Math.tan(a))) < 0.05);
});

test('real tires roll over a sharp crest and add clearance', () => {
	const a = deg(13);
	const pts = [{ x: -100, y: 0 }, { x: 0, y: 0 }, { x: 400 * Math.cos(a), y: -400 * Math.sin(a) }];
	const point = G.analyze(pts, car({ frontHeight: 50, rearHeight: 50 }))['nose-in'].worst.clearance;
	const tire = G.analyze(pts, car({ frontHeight: 50, rearHeight: 50, tireDiameter: 26 }))['nose-in'].worst.clearance;
	assert.ok(tire > point);
});

test('a profile that stops mid-slope keeps going at that slope', () => {
	// Stopping on a steady 10 degree drop must not add a sag that bumpers hit.
	const a = deg(10);
	const pts = [{ x: -100, y: 0 }, { x: 0, y: 0 }, { x: 240, y: -240 * Math.tan(a) }];
	assert.ok(Math.abs(G.heightAt(G.buildGround(pts), 400) + 400 * Math.tan(a)) < 1e-9);
	// Bumpers only gain clearance going over a crest, so the tightest moment
	// is parked on the flat street with the front bumper at its own height.
	for (const o of ['nose-in', 'tail-in']) {
		const worst = G.analyze(pts, car({ clearance: 50 }), 0.25)[o].worst;
		assert.ok(Math.abs(worst.clearance - 7) < 1e-6, `${o}: ${worst.clearance}`);
	}
});

test('validateCar rejects any car whose wheels would leave the run-out', () => {
	const pts = [{ x: -100, y: 0 }, { x: 0, y: 0 }, { x: 240, y: -40 }];
	for (const wheelbase of [200, 300, 380, 400]) {
		const c = car({ wheelbase, frontOverhang: 30, rearOverhang: 30, tireDiameter: 30 });
		if (G.validateCar(c).length) continue;
		const r = G.analyze(pts, c, 2);
		for (const o of ['nose-in', 'tail-in']) {
			assert.ok(r[o].samples.every(s => Number.isFinite(s.clearance)), `wheelbase ${wheelbase} ${o}`);
			// Starting on the flat run-out, the trailing wheel sits at full tire height.
			const first = G.pose(r.ground, c, o, r[o].from);
			assert.ok(Math.abs(first.trailing.y - G.heightAt(r.ground, first.trailing.x) - 15) < 1e-6, `wheelbase ${wheelbase} ${o}`);
		}
	}
	assert.deepEqual(G.validateCar(car({ wheelbase: 400, frontOverhang: 30, rearOverhang: 30, tireDiameter: 30 })), ['length']);
});

test("published answer for Elliott's driveway: a midsize sedan scrapes its underbody at the top", () => {
	const sedan = { wheelbase: 111, tireDiameter: 26, frontOverhang: 38, rearOverhang: 42, frontHeight: 6.5, rearHeight: 11, clearance: 5.5 };
	const r = G.analyze(G.HOME_POINTS, sedan, 1);
	for (const o of ['nose-in', 'tail-in']) {
		const w = r[o].worst;
		assert.equal(w.part, 'underbody');
		assert.ok(Math.abs(w.clearance + 0.34) < 0.05, `${o}: ${w.clearance}`);
		assert.ok(Math.abs(w.at) < 6, `${o}: at ${w.at}`);
	}
});

test('one-inch steps find the same worst gap as finer steps', () => {
	const a = deg(13);
	const pts = [{ x: -100, y: 0 }, { x: 0, y: 0 }, { x: 400 * Math.cos(a), y: -400 * Math.sin(a) }];
	const c = car({ tireDiameter: 26 });
	const coarse = G.analyze(pts, c, 1)['nose-in'].worst.clearance;
	const fine = G.analyze(pts, c, 0.25)['nose-in'].worst.clearance;
	assert.ok(Math.abs(coarse - fine) < 0.1);
});

test('slope readings and points convert both ways', () => {
	const readings = [{ length: 24, degrees: 0 }, { length: 24, degrees: 5 }, { length: 24, degrees: 13 }];
	const back = G.slopesFromPoints(G.pointsFromSlopes(readings));
	back.forEach((s, i) => {
		assert.ok(Math.abs(s.length - readings[i].length) < 1e-9);
		assert.ok(Math.abs(s.degrees - readings[i].degrees) < 1e-9);
	});
});

// Underside gap at one pose. The gap between two piecewise-straight lines
// is smallest at a segment end or a ground vertex, so a narrow ground peak
// between any two sample points must still be found.
test('a pose finds a narrow ground peak that sits between underside samples', () => {
	const c = { wheelbase: 100, tireDiameter: 1, frontOverhang: 0, rearOverhang: 0, frontHeight: 0.05, rearHeight: 0.05, clearance: 0.05 };
	const pts = [{ x: -100, y: 0 }, { x: 0.4, y: 0 }, { x: 0.5, y: 0.1 }, { x: 0.6, y: 0 }, { x: 200, y: 0 }];
	assert.deepEqual(G.validateCar(c), []);
	const ground = G.buildGround(pts);
	for (const o of ['nose-in', 'tail-in']) {
		const m = G.pose(ground, c, o, -49).min;
		assert.ok(Math.abs(m.clearance + 0.05) < 1e-9, `${o}: ${m.clearance}`);
		assert.ok(Math.abs(m.x - 0.5) < 1e-9, `${o}: at ${m.x}`);
		assert.equal(m.part, 'underbody');
	}
});

// Flat street with one spike 0.2 in wide. The trailing axle sits at x = 0, so
// the leading axle is at x = 100 and the leading bumper runs past it.
const spikeCar = { wheelbase: 100, tireDiameter: 0.002, frontOverhang: 30, rearOverhang: 40, frontHeight: 6, rearHeight: 10, clearance: 8 };
const spike = (x, h) => [{ x: -200, y: 0 }, { x: x - 0.1, y: 0 }, { x, y: h }, { x: x + 0.1, y: 0 }, { x: 400, y: 0 }];
const spikeMin = (o, x, h) => G.pose(G.buildGround(spike(x, h)), spikeCar, o, 0).min;
// Leading bumper underside height at x, and a spike x halfway between the old
// one-inch samples on that bumper segment.
const bumper = {
	'nose-in': { part: 'front bumper', between: 115, heightAt: x => 8 - ((x - 100) / 30) * 2 },
	'tail-in': { part: 'rear bumper', between: 120, heightAt: x => 8 + ((x - 100) / 40) * 2 },
};

for (const o of ['nose-in', 'tail-in']) {
	const { part, between, heightAt } = bumper[o];
	test(`${o}: a spike under the leading bumper, between samples, is a hit`, () => {
		const m = spikeMin(o, between, heightAt(between) + 0.25);
		assert.equal(m.part, part);
		assert.ok(Math.abs(m.clearance + 0.25) < 1e-9, `${m.clearance}`);
		assert.ok(Math.abs(m.x - between) < 1e-9);
	});
	test(`${o}: a spike that just touches the leading bumper reads zero`, () => {
		const m = spikeMin(o, between, heightAt(between));
		assert.ok(Math.abs(m.clearance) < 1e-9, `${m.clearance}`);
	});
	test(`${o}: a spike exactly under the leading bumper's tip hits that corner`, () => {
		const tip = o === 'nose-in' ? 130 : 140;
		const m = spikeMin(o, tip, heightAt(tip) + 0.1);
		assert.equal(m.part, part);
		assert.ok(Math.abs(m.clearance + 0.1) < 1e-9, `${m.clearance}`);
		assert.ok(Math.abs(m.x - tip) < 1e-9);
	});
}

test('a bumper with no overhang is a vertical segment; its lower end counts', () => {
	const ground = G.buildGround([{ x: -200, y: 0 }, { x: 400, y: 0 }]);
	for (const [front, rear, part] of [[3, 4, 'front bumper'], [4, 3, 'rear bumper']]) {
		const c = { ...spikeCar, frontOverhang: 0, frontHeight: front, rearOverhang: 0, rearHeight: rear };
		for (const o of ['nose-in', 'tail-in']) {
			const m = G.pose(ground, c, o, 0).min;
			assert.equal(m.part, part, o);
			assert.ok(Math.abs(m.clearance - 3) < 1e-9, `${o}: ${m.clearance}`);
		}
	}
});

test('pose minimum matches a dense check of the underside on bumpy profiles', () => {
	// Seeded, so a failure reproduces.
	let seed = 7;
	const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
	for (let trial = 0; trial < 40; trial++) {
		const pts = [{ x: -60, y: 0 }];
		while (pts.length < 40) pts.push({ x: pts[pts.length - 1].x + 0.05 + rand() * 6, y: pts[pts.length - 1].y + (rand() - 0.5) * 3 });
		const ground = G.buildGround(pts);
		const c = car({ tireDiameter: 20 + rand() * 10, clearance: 4 + rand() * 4 });
		for (const o of ['nose-in', 'tail-in']) {
			const p = G.pose(ground, c, o, -40 + rand() * 120);
			let dense = Infinity;
			for (let i = 0; i < 3; i++) {
				const a = p.underside[i];
				const b = p.underside[i + 1];
				for (let k = 0; k <= 4000; k++) {
					const x = a.x + (k / 4000) * (b.x - a.x);
					const y = a.y + (k / 4000) * (b.y - a.y);
					dense = Math.min(dense, y - G.heightAt(ground, x));
				}
			}
			// Exact minimum is never above any sampled gap, and the dense
			// samples (spacing under 0.05 in) land within a hair of it.
			assert.ok(p.min.clearance <= dense + 1e-9, `trial ${trial} ${o}: ${p.min.clearance} > ${dense}`);
			assert.ok(dense - p.min.clearance < 0.15, `trial ${trial} ${o}: ${p.min.clearance} vs ${dense}`);
		}
	}
});

test("one-inch travel steps match tenth-inch steps for every preset on Elliott's driveway", () => {
	// Backs the page's "less than 0.01 in" note. Travel between poses is still
	// sampled, so this compares; it does not prove a bound for every profile.
	// Same numbers as PRESETS in static/js/driveway-clearance.js.
	const cars = {
		sedan: { wheelbase: 111, tireDiameter: 26, frontOverhang: 38, rearOverhang: 42, frontHeight: 6.5, rearHeight: 11, clearance: 5.5 },
		sports: { wheelbase: 100, tireDiameter: 25, frontOverhang: 37, rearOverhang: 34, frontHeight: 4.5, rearHeight: 9, clearance: 4.5 },
		compact: { wheelbase: 104, tireDiameter: 25, frontOverhang: 34, rearOverhang: 30, frontHeight: 6.5, rearHeight: 12, clearance: 5.5 },
		minivan: { wheelbase: 121, tireDiameter: 28, frontOverhang: 40, rearOverhang: 43, frontHeight: 7.5, rearHeight: 13, clearance: 6 },
		suv: { wheelbase: 112, tireDiameter: 29, frontOverhang: 37, rearOverhang: 40, frontHeight: 9, rearHeight: 15, clearance: 8 },
		pickup: { wheelbase: 145, tireDiameter: 32, frontOverhang: 38, rearOverhang: 52, frontHeight: 12, rearHeight: 20, clearance: 9.5 },
	};
	for (const [name, c] of Object.entries(cars)) {
		const coarse = G.analyze(G.HOME_POINTS, c, 1);
		const fine = G.analyze(G.HOME_POINTS, c, 0.1);
		for (const o of ['nose-in', 'tail-in']) {
			const d = coarse[o].worst.clearance - fine[o].worst.clearance;
			assert.ok(d >= -1e-9 && d < 0.01, `${name} ${o}: coarse ${coarse[o].worst.clearance} fine ${fine[o].worst.clearance}`);
		}
	}
});
