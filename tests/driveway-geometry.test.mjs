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
