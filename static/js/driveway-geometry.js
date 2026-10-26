// driveway-geometry.js - side-view clearance model for a car crossing a driveway.
//
// Units are inches. x runs along the driveway from the street (low x) toward
// the garage (high x); y is height. The driveway is a polyline of measured
// points, extended past both ends at the slope of the end segments, so a
// profile that stops mid-slope does not grow a fake sag or crest.
//
// The car is rigid (no suspension travel). Each tire is a circle that rolls on
// the polyline, so a wheel centre is the highest point a circle of the tire's
// radius can sit at above a given x. The underside is a polyline in the car's
// frame: trailing bumper, underbody at the trailing axle, underbody at the
// leading axle, leading bumper. Clearance is the vertical gap between that
// polyline and the ground directly below it.

(function (root, factory) {
	const api = factory();
	if (typeof module !== 'undefined' && module.exports) module.exports = api;
	else root.DrivewayGeometry = api;
})(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	// Horizontal run added before the first and after the last measured point.
	const RUN_OUT = 420;

	function buildGround(points) {
		if (points.length < 2) throw new Error('the driveway needs at least two points');
		const pts = points.map(p => ({ x: p.x, y: p.y })).sort((a, b) => a.x - b.x);
		for (let i = 1; i < pts.length; i++) {
			if (pts[i].x - pts[i - 1].x < 1e-6) throw new Error('two driveway points share the same distance');
		}
		const first = pts[0];
		const last = pts[pts.length - 1];
		const startSlope = (pts[1].y - first.y) / (pts[1].x - first.x);
		const endSlope = (last.y - pts[pts.length - 2].y) / (last.x - pts[pts.length - 2].x);
		pts.unshift({ x: first.x - RUN_OUT, y: first.y - startSlope * RUN_OUT });
		pts.push({ x: last.x + RUN_OUT, y: last.y + endSlope * RUN_OUT });
		return { pts, start: first.x, end: last.x, minX: pts[0].x, maxX: pts[pts.length - 1].x };
	}

	function segmentIndex(ground, x) {
		const p = ground.pts;
		let lo = 0;
		let hi = p.length - 2;
		if (x <= p[0].x) return 0;
		if (x >= p[hi + 1].x) return hi;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (p[mid].x <= x) lo = mid;
			else hi = mid - 1;
		}
		return lo;
	}

	function heightAt(ground, x) {
		const p = ground.pts;
		const i = segmentIndex(ground, x);
		const a = p[i];
		const b = p[i + 1];
		const t = (x - a.x) / (b.x - a.x);
		return a.y + t * (b.y - a.y);
	}

	function slopeAt(ground, x) {
		const p = ground.pts;
		const i = segmentIndex(ground, x);
		return (p[i + 1].y - p[i].y) / (p[i + 1].x - p[i].x);
	}

	// Height of a tire's centre when the tire rests on the ground above x.
	// The tire touches either a segment's interior (centre sits R along the
	// segment's normal) or a vertex (centre sits on a circle round the vertex).
	function wheelCenterY(ground, x, r) {
		const p = ground.pts;
		let best = -Infinity;
		const iLo = segmentIndex(ground, x - r);
		const iHi = segmentIndex(ground, x + r);
		for (let i = iLo; i <= iHi; i++) {
			const a = p[i];
			const b = p[i + 1];
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const len = Math.hypot(dx, dy);
			const tx = dx / len;
			const ty = dy / len;
			// Contact point on the segment for a centre directly above x.
			const cx = x + r * ty;
			if (cx >= a.x && cx <= b.x) {
				const y = a.y + ((cx - a.x) / dx) * dy + r * tx;
				if (y > best) best = y;
			}
			for (const v of [a, b]) {
				const d = x - v.x;
				if (Math.abs(d) <= r) {
					const y = v.y + Math.sqrt(r * r - d * d);
					if (y > best) best = y;
				}
			}
		}
		return best;
	}

	// Place the leading wheel one wheelbase from the trailing wheel, both on
	// the ground. The gap to the trailing centre grows with x over this range,
	// so bisection finds it.
	function leadingWheel(ground, trailing, wheelbase, r) {
		let lo = trailing.x;
		let hi = trailing.x + wheelbase;
		for (let k = 0; k < 60; k++) {
			const mid = (lo + hi) / 2;
			const d = Math.hypot(mid - trailing.x, wheelCenterY(ground, mid, r) - trailing.y);
			if (d < wheelbase) lo = mid;
			else hi = mid;
		}
		const x = (lo + hi) / 2;
		return { x, y: wheelCenterY(ground, x, r) };
	}

	// Underside polyline in the car frame: x forward from the trailing axle,
	// y = height above level ground. orientation 'nose-in' puts the front
	// bumper toward the garage; 'tail-in' puts the rear bumper there.
	function underside(car, orientation) {
		const L = car.wheelbase;
		const front = { overhang: car.frontOverhang, height: car.frontHeight, name: 'front bumper' };
		const rear = { overhang: car.rearOverhang, height: car.rearHeight, name: 'rear bumper' };
		const [trail, lead] = orientation === 'nose-in' ? [rear, front] : [front, rear];
		return [
			{ x: -trail.overhang, y: trail.height, part: trail.name },
			{ x: 0, y: car.clearance, part: 'underbody' },
			{ x: L, y: car.clearance, part: lead.name },
			{ x: L + lead.overhang, y: lead.height, part: null },
		];
	}

	// Each underside segment is named after the part it belongs to: the
	// trailing overhang, the belly, then the leading overhang.
	function segmentName(poly, i) {
		return i === 0 ? poly[0].part : i === 1 ? 'underbody' : poly[2].part;
	}

	function pose(ground, car, orientation, trailingX) {
		const r = car.tireDiameter / 2;
		const trailing = { x: trailingX, y: wheelCenterY(ground, trailingX, r) };
		const leading = leadingWheel(ground, trailing, car.wheelbase, r);
		const ux = (leading.x - trailing.x) / car.wheelbase;
		const uy = (leading.y - trailing.y) / car.wheelbase;
		const toWorld = (bx, by) => ({
			x: trailing.x + bx * ux - (by - r) * uy,
			y: trailing.y + bx * uy + (by - r) * ux,
		});

		const poly = underside(car, orientation);
		const world = poly.map(p => toWorld(p.x, p.y));
		let min = { clearance: Infinity };
		for (let i = 0; i < poly.length - 1; i++) {
			const a = world[i];
			const b = world[i + 1];
			const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
			for (let k = 0; k <= n; k++) {
				const t = k / n;
				const x = a.x + t * (b.x - a.x);
				const y = a.y + t * (b.y - a.y);
				const clearance = y - heightAt(ground, x);
				if (clearance < min.clearance) min = { clearance, x, y, part: segmentName(poly, i) };
			}
		}
		const pitch = Math.atan2(uy, ux);
		return { trailing, leading, r, pitch, underside: world, toWorld, min };
	}

	// Trailing-axle positions that take the car from fully on the street to
	// fully past the last measured point.
	function travelRange(ground, car, orientation) {
		const poly = underside(car, orientation);
		const back = -poly[0].x + car.tireDiameter / 2;
		const ahead = poly[3].x + car.tireDiameter / 2;
		return { from: ground.start - ahead - 6, to: ground.end + back + 6 };
	}

	function sweep(ground, car, orientation, step = 1) {
		const { from, to } = travelRange(ground, car, orientation);
		const samples = [];
		let worst = null;
		for (let x = from; x <= to + 1e-9; x += step) {
			const p = pose(ground, car, orientation, x);
			const s = { x, mid: (p.trailing.x + p.leading.x) / 2, clearance: p.min.clearance, part: p.min.part, at: p.min.x };
			samples.push(s);
			if (!worst || s.clearance < worst.clearance) worst = s;
		}
		return { orientation, from, to, samples, worst };
	}

	function validateCar(car) {
		const problems = [];
		const positive = ['wheelbase', 'tireDiameter'];
		const nonNegative = ['frontOverhang', 'rearOverhang', 'frontHeight', 'rearHeight', 'clearance'];
		for (const k of positive) if (!(car[k] > 0)) problems.push(k);
		for (const k of nonNegative) if (!(car[k] >= 0)) problems.push(k);
		if (car.wheelbase + car.frontOverhang + car.rearOverhang > 2 * RUN_OUT - 60) problems.push('length');
		return problems;
	}

	function analyze(points, car, step = 1) {
		const ground = buildGround(points);
		return {
			ground,
			'nose-in': sweep(ground, car, 'nose-in', step),
			'tail-in': sweep(ground, car, 'tail-in', step),
		};
	}

	// Profile helpers. A slope reading is a board laid along the driveway:
	// its length (inches) and the angle a level reads on it, positive downhill
	// when walking from the street toward the garage.
	function pointsFromSlopes(readings, start = { x: 0, y: 0 }) {
		const out = [{ x: start.x, y: start.y }];
		for (const { length, degrees } of readings) {
			const prev = out[out.length - 1];
			const a = (degrees * Math.PI) / 180;
			out.push({ x: prev.x + length * Math.cos(a), y: prev.y - length * Math.sin(a) });
		}
		return out;
	}

	function slopesFromPoints(points) {
		const out = [];
		for (let i = 1; i < points.length; i++) {
			const dx = points[i].x - points[i - 1].x;
			const dy = points[i].y - points[i - 1].y;
			out.push({ length: Math.hypot(dx, dy), degrees: (-Math.atan2(dy, dx) * 180) / Math.PI });
		}
		return out;
	}

	return {
		RUN_OUT,
		buildGround,
		heightAt,
		slopeAt,
		wheelCenterY,
		underside,
		pose,
		travelRange,
		sweep,
		analyze,
		validateCar,
		pointsFromSlopes,
		slopesFromPoints,
	};
});
