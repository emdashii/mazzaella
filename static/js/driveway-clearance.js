// driveway-clearance.js - page wiring for the driveway clearance calculator.
// The geometry lives in driveway-geometry.js; this file reads inputs, draws
// the side view and the clearance chart, and keeps the share link current.

(function () {
	'use strict';
	const G = window.DrivewayGeometry;

	// Rough archetypes, not any specific model. Inches.
	const PRESETS = {
		sedan: { label: 'midsize sedan', wheelbase: 111, tireDiameter: 26, frontOverhang: 38, rearOverhang: 42, frontHeight: 6.5, rearHeight: 11, clearance: 5.5 },
		sports: { label: 'low sports car', wheelbase: 100, tireDiameter: 25, frontOverhang: 37, rearOverhang: 34, frontHeight: 4.5, rearHeight: 9, clearance: 4.5 },
		compact: { label: 'compact hatchback', wheelbase: 104, tireDiameter: 25, frontOverhang: 34, rearOverhang: 30, frontHeight: 6.5, rearHeight: 12, clearance: 5.5 },
		minivan: { label: 'minivan', wheelbase: 121, tireDiameter: 28, frontOverhang: 40, rearOverhang: 43, frontHeight: 7.5, rearHeight: 13, clearance: 6 },
		suv: { label: 'crossover / suv', wheelbase: 112, tireDiameter: 29, frontOverhang: 37, rearOverhang: 40, frontHeight: 9, rearHeight: 15, clearance: 8 },
		pickup: { label: 'full-size pickup', wheelbase: 145, tireDiameter: 32, frontOverhang: 38, rearOverhang: 52, frontHeight: 12, rearHeight: 20, clearance: 9.5 },
	};
	const CAR_KEYS = ['wheelbase', 'tireDiameter', 'frontOverhang', 'rearOverhang', 'frontHeight', 'rearHeight', 'clearance'];

	const HOME_POINTS = G.HOME_POINTS;

	const ORIENT = {
		'nose-in': { label: 'nose first', note: 'driving in forward' },
		'tail-in': { label: 'tail first', note: 'backing in' },
	};

	const $ = id => document.getElementById(id);
	const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
	const ft = inches => `${fmt(inches / 12)} ft`;
	// aria-invalid="" means false, so set the word.
	const markInvalid = (el, bad) => (bad ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid'));

	const state = {
		car: { ...PRESETS.sedan },
		points: HOME_POINTS.map(p => ({ ...p })),
		mode: 'heights',
		margin: 1,
		orientation: 'nose-in',
		index: 0,
		result: null,
		// Set while the driveway table holds something that is not a profile.
		profileError: null,
		// Car centre to return to once an invalid edit is corrected.
		resumeMid: null,
		playing: false,
		hover: null,
	};

	// ---------- inputs ----------

	function readCar() {
		const car = {};
		for (const k of CAR_KEYS) car[k] = parseFloat($(`dc-${k}`).value);
		return car;
	}

	function writeCar(car) {
		for (const k of CAR_KEYS) $(`dc-${k}`).value = car[k];
	}

	function matchPreset(car) {
		for (const [key, p] of Object.entries(PRESETS)) {
			if (CAR_KEYS.every(k => p[k] === car[k])) return key;
		}
		return 'custom';
	}

	function profileRows() {
		if (state.mode === 'slopes') {
			return G.slopesFromPoints(state.points).map(s => [fmt(s.length, 1), fmt(s.degrees, 1)]);
		}
		return state.points.map(p => [fmt(p.x / 12, 2), fmt(p.y, 1)]);
	}

	function profileHead() {
		return state.mode === 'slopes' ? ['board length (in)', 'angle (°, + = downhill)'] : ['distance from street edge (ft)', 'height (in, − = below street)'];
	}

	function renderProfileTable() {
		const head = profileHead();
		$('dc-profile-head').innerHTML = `<tr><th>#</th><th>${head[0]}</th><th>${head[1]}</th><th></th></tr>`;
		$('dc-profile-body').innerHTML = '';
		profileRows().forEach(appendProfileRow);
	}

	function appendProfileRow(row) {
		const body = $('dc-profile-body');
		const head = profileHead();
		const n = body.rows.length + 1;
		const tr = document.createElement('tr');
		tr.innerHTML =
			`<td>${n}</td>` +
			`<td><input type="number" step="any" value="${row[0]}" aria-label="${head[0]}, row ${n}"></td>` +
			`<td><input type="number" step="any" value="${row[1]}" aria-label="${head[1]}, row ${n}"></td>` +
			`<td><button type="button" class="dc-remove" aria-label="remove row ${n}">×</button></td>`;
		body.appendChild(tr);
	}

	function readProfileTable() {
		const inputs = [...$('dc-profile-body').querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('input')]);
		for (const i of inputs.flat()) markInvalid(i, !Number.isFinite(parseFloat(i.value)));
		const rows = inputs.map(r => r.map(i => parseFloat(i.value)));
		if (rows.some(r => r.some(v => !Number.isFinite(v)))) throw new Error('every driveway cell needs a number');
		if (state.mode === 'slopes') {
			if (rows.some(r => r[0] <= 0)) throw new Error('board lengths must be positive');
			if (rows.some(r => Math.abs(r[1]) >= 90)) throw new Error('angles must be between -90 and 90 degrees');
			return G.pointsFromSlopes(rows.map(([length, degrees]) => ({ length, degrees })), state.points[0]);
		}
		return rows.map(([d, h]) => ({ x: d * 12, y: h }));
	}

	// ---------- share link ----------

	function writeHash() {
		const parts = [`car=${CAR_KEYS.map(k => state.car[k]).join(',')}`];
		if (!samePoints(state.points, HOME_POINTS)) {
			parts.push(`dw=${state.points.map(p => `${+fmt(p.x, 2)}:${+fmt(p.y, 2)}`).join(',')}`);
		}
		if (state.margin !== 1) parts.push(`m=${state.margin}`);
		// Leave the address alone until something differs from the defaults.
		const isDefault = parts.length === 1 && matchPreset(state.car) === 'sedan';
		if (isDefault && !location.hash) return;
		history.replaceState(null, '', isDefault ? location.pathname + location.search : `#${parts.join('&')}`);
	}

	function readHash() {
		const params = new URLSearchParams(location.hash.slice(1));
		const car = params.get('car');
		if (car) {
			const v = car.split(',').map(Number);
			if (v.length === CAR_KEYS.length && v.every(Number.isFinite)) CAR_KEYS.forEach((k, i) => (state.car[k] = v[i]));
		}
		const dw = params.get('dw');
		if (dw) {
			const pts = dw.split(',').map(s => s.split(':').map(Number));
			if (pts.length >= 2 && pts.every(p => p.length === 2 && p.every(Number.isFinite))) state.points = pts.map(([x, y]) => ({ x, y }));
		}
		const m = parseFloat(params.get('m'));
		if (Number.isFinite(m) && m >= 0) state.margin = m;
	}

	function samePoints(a, b) {
		return a.length === b.length && a.every((p, i) => Math.abs(p.x - b[i].x) < 0.01 && Math.abs(p.y - b[i].y) < 0.01);
	}

	// ---------- analysis ----------

	function verdict(worst) {
		if (worst.clearance < 0) return { kind: 'scrape', icon: '✕', word: 'scrapes' };
		if (worst.clearance < state.margin) return { kind: 'tight', icon: '!', word: 'too close to call' };
		return { kind: 'clear', icon: '✓', word: 'clears' };
	}

	function place(x) {
		if (Math.abs(x) < 6) return 'at the street edge';
		return x < 0 ? `${ft(-x)} before the street edge` : `${ft(x)} past the street edge`;
	}

	function describe(worst) {
		if (worst.clearance < 0) return `${worst.part} hits by ${fmt(-worst.clearance)} in, ${place(worst.at)}`;
		return `${fmt(worst.clearance)} in to spare at the tightest spot (${worst.part}, ${place(worst.at)})`;
	}

	// Anything that stops the inputs on screen from describing one car on one
	// driveway. Checked as a whole, so fixing one input never brings back an
	// answer computed from another input's old value.
	function inputProblem() {
		const problems = G.validateCar(state.car);
		for (const k of CAR_KEYS) markInvalid($(`dc-${k}`), problems.includes(k));
		markInvalid($('dc-margin'), !(state.margin >= 0));
		if (problems.includes('length')) return 'that car is longer than this tool handles.';
		if (problems.length) return 'every car measurement needs a number (wheelbase and tire size above zero).';
		if (!(state.margin >= 0)) return 'the safety margin needs a number, 0 or more.';
		return state.profileError;
	}

	// No answer for these inputs: take the old one off the page and out of
	// reach (results, drawing, playback, share link) until they are fixed.
	function showError(message) {
		if (state.result) state.resumeMid = currentSample().mid;
		state.result = null;
		stop();
		$('dc-error').textContent = message;
		$('dc-headline').textContent = '';
		$('dc-results').innerHTML = '';
		$('dc-output').inert = true;
		$('dc-output').classList.add('dc-stale');
	}

	function recompute() {
		const problem = inputProblem();
		if (problem) {
			showError(problem);
			return;
		}
		let result;
		try {
			result = G.analyze(state.points, state.car, 1);
		} catch (e) {
			showError(e.message + '.');
			return;
		}
		const prevMid = state.result ? currentSample().mid : state.resumeMid;
		state.result = result;
		state.resumeMid = null;
		state.index = prevMid === null ? worstIndex(state.orientation) : nearestIndex(state.orientation, prevMid);
		$('dc-error').textContent = '';
		$('dc-output').inert = false;
		$('dc-output').classList.remove('dc-stale');
		renderResults();
		renderAngles();
		syncSlider();
		draw();
		writeHash();
	}

	function sweepFor(o) {
		return state.result[o];
	}

	function currentSample() {
		const samples = sweepFor(state.orientation).samples;
		state.index = Math.max(0, Math.min(samples.length - 1, state.index));
		return samples[state.index];
	}

	function worstIndex(o) {
		const s = sweepFor(o);
		return s.samples.indexOf(s.worst);
	}

	function nearestIndex(o, mid) {
		const samples = sweepFor(o).samples;
		let best = 0;
		samples.forEach((s, i) => {
			if (Math.abs(s.mid - mid) < Math.abs(samples[best].mid - mid)) best = i;
		});
		return best;
	}

	function renderResults() {
		const rows = Object.keys(ORIENT).map(o => {
			const w = sweepFor(o).worst;
			const v = verdict(w);
			// Explicit roles keep the table's meaning when narrow screens
			// lay the rows out as grids.
			return `<tr class="dc-${v.kind}" role="row"><th scope="row" role="rowheader">${ORIENT[o].label}<span class="dc-sub">${ORIENT[o].note}</span></th>` +
				`<td role="cell" class="dc-verdict"><span class="dc-badge" aria-hidden="true">${v.icon}</span> ${v.word}</td>` +
				`<td role="cell" class="dc-detail">${describe(w)}</td>` +
				`<td role="cell" class="dc-action"><button type="button" class="dc-show" data-o="${o}" aria-label="show me ${ORIENT[o].label}">show me</button></td></tr>`;
		});
		$('dc-results').innerHTML = rows.join('');
		$('dc-headline').textContent = headline(Object.fromEntries(Object.keys(ORIENT).map(o => [o, verdict(sweepFor(o).worst).kind])));
	}

	// One sentence that never says more than the two verdict rows do.
	function headline(kind) {
		const of = k => Object.keys(ORIENT).filter(o => kind[o] === k);
		const [scrape, tight, clear] = ['scrape', 'tight', 'clear'].map(of);
		const name = o => ORIENT[o].label;
		const spare = `less than ${fmt(state.margin)} in to spare`;
		if (clear.length === 2) return 'this car makes it, either direction.';
		if (scrape.length === 2) return 'this car scrapes, whichever way it goes in.';
		if (tight.length === 2) return `too close to call either way: ${spare}.`;
		if (scrape.length && tight.length) return `this car scrapes ${name(scrape[0])}, and ${name(tight[0])} is too close to call.`;
		if (scrape.length) return `this car scrapes one way. go in ${name(clear[0])} (${ORIENT[clear[0]].note}).`;
		return `this car makes it ${name(clear[0])}. ${name(tight[0])} is too close to call: ${spare}.`;
	}

	function renderAngles() {
		const c = state.car;
		const r = c.tireDiameter / 2;
		const overhangAngle = (o, h) => {
			const d = Math.hypot(o, h - r);
			return d <= r ? 90 : ((Math.atan2(h - r, o) + Math.asin(r / d)) * 180) / Math.PI;
		};
		const breakover = (2 * Math.atan((2 * c.clearance) / c.wheelbase) * 180) / Math.PI;
		$('dc-angles').textContent =
			`approach ${fmt(overhangAngle(c.frontOverhang, c.frontHeight))}°, ` +
			`departure ${fmt(overhangAngle(c.rearOverhang, c.rearHeight))}°, ` +
			`breakover about ${fmt(breakover)}°`;
	}

	// ---------- drawing ----------

	function colors() {
		const cs = getComputedStyle(document.body);
		const v = name => cs.getPropertyValue(name).trim();
		const dark = document.body.classList.contains('darkmode');
		return {
			bg: v('--bg'),
			fg: v('--fg'),
			fg2: v('--fg2'),
			fg4: v('--fg4'),
			grid: v('--bg2'),
			ground: v('--bg1'),
			red: v('--red'),
			yellow: v('--yellow'),
			// Series hues: validated pairs for each scheme (blue-600/orange-600
			// on paper, blue-400/orange-400 on base-900).
			'nose-in': dark ? '#4385BE' : '#205EA6',
			'tail-in': dark ? '#DA702C' : '#BC5215',
		};
	}

	function fitCanvas(canvas) {
		const dpr = window.devicePixelRatio || 1;
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
		}
		const ctx = canvas.getContext('2d');
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		return { ctx, w, h };
	}

	// Silhouette in the nose-in car frame, as (distance back from the front
	// bumper, height). Only the underside is to the user's numbers; the upper
	// body is decoration.
	function silhouette(car) {
		const T = car.rearOverhang + car.wheelbase + car.frontOverhang;
		const top = Math.max(50, car.tireDiameter * 1.9);
		const s = [
			[0, car.frontHeight], [0, car.frontHeight + 14], [0.06 * T, car.tireDiameter + 6], [0.28 * T, car.tireDiameter + 10],
			[0.42 * T, top], [0.72 * T, top], [0.88 * T, car.tireDiameter + 12], [T, car.tireDiameter + 8], [T, car.rearHeight],
		];
		return s.map(([d, h]) => ({ d, h }));
	}

	function drawScene() {
		const canvas = $('dc-scene');
		const { ctx, w, h } = fitCanvas(canvas);
		const col = colors();
		const res = state.result;
		const ground = res.ground;
		const car = state.car;
		const o = state.orientation;
		const sample = currentSample();
		const p = G.pose(ground, car, o, sample.x);

		// Follow the car at true scale: the car spans about 70% of the width.
		const T = car.rearOverhang + car.wheelbase + car.frontOverhang;
		const scale = Math.min((w * 0.7) / T, h / 90);
		const cx = sample.mid;
		const cy = (p.trailing.y + p.leading.y) / 2 + 12;
		const X = x => w / 2 + (x - cx) * scale;
		const Y = y => h * 0.55 - (y - cy) * scale;
		const xMin = cx - w / 2 / scale;
		const xMax = cx + w / 2 / scale;

		ctx.clearRect(0, 0, w, h);

		// Grid every foot.
		ctx.strokeStyle = col.grid;
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let gx = Math.ceil(xMin / 12) * 12; gx <= xMax; gx += 12) {
			ctx.moveTo(Math.round(X(gx)) + 0.5, 0);
			ctx.lineTo(Math.round(X(gx)) + 0.5, h);
		}
		const yTop = cy + (h * 0.55) / scale;
		const yBot = cy - (h * 0.45) / scale;
		for (let gy = Math.ceil(yBot / 12) * 12; gy <= yTop; gy += 12) {
			ctx.moveTo(0, Math.round(Y(gy)) + 0.5);
			ctx.lineTo(w, Math.round(Y(gy)) + 0.5);
		}
		ctx.stroke();

		// Ground.
		const gpts = ground.pts.filter((q, i, a) => (a[i + 1] ? a[i + 1].x >= xMin : true) && (a[i - 1] ? a[i - 1].x <= xMax : true));
		ctx.beginPath();
		gpts.forEach((q, i) => (i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y))));
		ctx.lineTo(X(gpts[gpts.length - 1].x), h);
		ctx.lineTo(X(gpts[0].x), h);
		ctx.closePath();
		ctx.fillStyle = col.ground;
		ctx.fill();
		ctx.beginPath();
		gpts.forEach((q, i) => (i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y))));
		ctx.strokeStyle = col.fg;
		ctx.lineWidth = 2;
		ctx.stroke();

		// Street edge and last measured point.
		ctx.fillStyle = col.fg2;
		ctx.font = '12px sans-serif';
		ctx.textAlign = 'center';
		for (const [x, label] of [[0, 'street edge'], [ground.end, 'last reading']]) {
			if (x < xMin || x > xMax) continue;
			const yy = Y(G.heightAt(ground, x));
			ctx.fillRect(X(x) - 1, yy, 2, 8);
			ctx.fillText(label, X(x), yy + 22);
		}

		// Body. Map nose-in frame (d back from front bumper) to the pose frame.
		const toFrame = d => (o === 'nose-in' ? car.wheelbase + car.frontOverhang - d : d - car.frontOverhang);
		const body = silhouette(car).map(q => p.toWorld(toFrame(q.d), q.h));
		const under = p.underside;
		const series = col[o];
		ctx.beginPath();
		const outline = o === 'nose-in' ? [...body, ...under] : [...body, ...under.slice().reverse()];
		outline.forEach((q, i) => (i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y))));
		ctx.closePath();
		ctx.globalAlpha = 0.14;
		ctx.fillStyle = series;
		ctx.fill();
		ctx.globalAlpha = 1;
		ctx.strokeStyle = col.fg4;
		ctx.lineWidth = 1;
		ctx.stroke();

		// Underside, the part that matters.
		ctx.beginPath();
		under.forEach((q, i) => (i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y))));
		ctx.strokeStyle = series;
		ctx.lineWidth = 3;
		ctx.stroke();

		// Tires.
		for (const wc of [p.trailing, p.leading]) {
			ctx.beginPath();
			ctx.arc(X(wc.x), Y(wc.y), p.r * scale, 0, Math.PI * 2);
			ctx.fillStyle = col.bg;
			ctx.fill();
			ctx.strokeStyle = col.fg;
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(X(wc.x), Y(wc.y), 2.5, 0, Math.PI * 2);
			ctx.fillStyle = col.fg;
			ctx.fill();
		}

		// Tightest point right now.
		const m = p.min;
		const gy = G.heightAt(ground, m.x);
		const v = verdict(m);
		const mark = v.kind === 'scrape' ? col.red : v.kind === 'tight' ? col.yellow : col.fg2;
		ctx.strokeStyle = mark;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(X(m.x), Y(m.y));
		ctx.lineTo(X(m.x), Y(gy));
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(X(m.x), Y(Math.min(m.y, gy)), 4, 0, Math.PI * 2);
		ctx.fillStyle = mark;
		ctx.fill();
		// Caption in the corner, so it never collides with the drawing.
		const label = m.clearance < 0 ? `tightest now: ${m.part}, ${fmt(-m.clearance)} in into the ground` : `tightest now: ${m.part}, ${fmt(m.clearance)} in`;
		ctx.font = '13px sans-serif';
		ctx.textAlign = 'left';
		ctx.lineWidth = 4;
		ctx.strokeStyle = col.bg;
		ctx.strokeText(label, 10, 20);
		ctx.fillStyle = col.fg;
		ctx.fillText(label, 10, 20);

		// Scale bar.
		ctx.fillStyle = col.fg2;
		ctx.fillRect(12, h - 14, 12 * scale, 2);
		ctx.textAlign = 'left';
		ctx.font = '12px sans-serif';
		ctx.fillText('1 ft', 12, h - 20);

		$('dc-position-label').textContent = `car centre ${place(sample.mid)}. ${label}.`;
	}

	// Clearance chart: x = where the car's centre is, y = smallest gap.
	function chartLayout(w, h) {
		const res = state.result;
		const all = Object.keys(ORIENT).flatMap(o => sweepFor(o).samples);
		const xLo = Math.min(...all.map(s => s.mid));
		const xHi = Math.max(...all.map(s => s.mid));
		const yLo = Math.min(-1, ...all.map(s => s.clearance)) - 0.5;
		const yHi = Math.max(state.margin + 1, ...all.map(s => s.clearance)) + 0.5;
		const pad = { l: 44, r: 12, t: 12, b: 30 };
		return {
			res,
			pad,
			xLo,
			xHi,
			yLo,
			yHi,
			X: x => pad.l + ((x - xLo) / (xHi - xLo)) * (w - pad.l - pad.r),
			Y: y => pad.t + ((yHi - y) / (yHi - yLo)) * (h - pad.t - pad.b),
			invX: px => xLo + ((px - pad.l) / (w - pad.l - pad.r)) * (xHi - xLo),
			invY: py => yHi - ((py - pad.t) / (h - pad.t - pad.b)) * (yHi - yLo),
		};
	}

	function niceStep(range, target) {
		const raw = range / target;
		const mag = 10 ** Math.floor(Math.log10(raw));
		return [1, 2, 5, 10].map(k => k * mag).find(k => k >= raw);
	}

	function drawChart() {
		if (!state.result) return;
		const canvas = $('dc-chart');
		const { ctx, w, h } = fitCanvas(canvas);
		const col = colors();
		const L = chartLayout(w, h);
		ctx.clearRect(0, 0, w, h);
		ctx.font = '12px sans-serif';

		// Margin band and contact line.
		ctx.fillStyle = col.yellow;
		ctx.globalAlpha = 0.12;
		ctx.fillRect(L.pad.l, L.Y(state.margin), w - L.pad.l - L.pad.r, L.Y(0) - L.Y(state.margin));
		ctx.fillStyle = col.red;
		ctx.fillRect(L.pad.l, L.Y(0), w - L.pad.l - L.pad.r, L.Y(L.yLo) - L.Y(0));
		ctx.globalAlpha = 1;

		// Axes and grid.
		ctx.strokeStyle = col.grid;
		ctx.lineWidth = 1;
		ctx.fillStyle = col.fg2;
		ctx.textAlign = 'right';
		const ys = niceStep(L.yHi - L.yLo, 5);
		for (let y = Math.ceil(L.yLo / ys) * ys; y <= L.yHi; y += ys) {
			const py = Math.round(L.Y(y)) + 0.5;
			ctx.beginPath();
			ctx.moveTo(L.pad.l, py);
			ctx.lineTo(w - L.pad.r, py);
			ctx.stroke();
			ctx.fillText(`${+y.toFixed(1)} in`, L.pad.l - 6, py + 4);
		}
		ctx.textAlign = 'center';
		const xs = niceStep((L.xHi - L.xLo) / 12, 6) * 12;
		for (let x = Math.ceil(L.xLo / xs) * xs; x <= L.xHi; x += xs) {
			ctx.fillText(`${+(x / 12).toFixed(1)} ft`, L.X(x), h - 10);
		}
		ctx.strokeStyle = col.red;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(L.pad.l, Math.round(L.Y(0)) + 0.5);
		ctx.lineTo(w - L.pad.r, Math.round(L.Y(0)) + 0.5);
		ctx.stroke();

		// Series: nose first solid, tail first dashed, so identity is not colour alone.
		for (const o of Object.keys(ORIENT)) {
			ctx.beginPath();
			sweepFor(o).samples.forEach((s, i) => (i ? ctx.lineTo(L.X(s.mid), L.Y(s.clearance)) : ctx.moveTo(L.X(s.mid), L.Y(s.clearance))));
			ctx.strokeStyle = col[o];
			ctx.lineWidth = 2;
			ctx.setLineDash(o === 'tail-in' ? [6, 4] : []);
			ctx.stroke();
			ctx.setLineDash([]);
		}

		// Current position.
		const s = currentSample();
		ctx.strokeStyle = col.fg4;
		ctx.beginPath();
		ctx.moveTo(Math.round(L.X(s.mid)) + 0.5, L.pad.t);
		ctx.lineTo(Math.round(L.X(s.mid)) + 0.5, h - L.pad.b);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(L.X(s.mid), L.Y(s.clearance), 5, 0, Math.PI * 2);
		ctx.fillStyle = col[state.orientation];
		ctx.fill();
		ctx.strokeStyle = col.bg;
		ctx.lineWidth = 2;
		ctx.stroke();

		// Hover readout.
		const tip = $('dc-tip');
		if (state.hover === null) {
			tip.hidden = true;
			return;
		}
		const at = Object.keys(ORIENT).map(o => sweepFor(o).samples[nearestIndex(o, state.hover)]);
		ctx.strokeStyle = col.fg2;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(Math.round(L.X(state.hover)) + 0.5, L.pad.t);
		ctx.lineTo(Math.round(L.X(state.hover)) + 0.5, h - L.pad.b);
		ctx.stroke();
		tip.hidden = false;
		tip.innerHTML =
			`<strong>car centre ${ft(state.hover)}</strong>` +
			Object.keys(ORIENT)
				.map((o, i) => `<span><i class="dc-key dc-key-${o}"></i>${ORIENT[o].label}: ${fmt(at[i].clearance)} in (${at[i].part})</span>`)
				.join('');
		const px = L.X(state.hover);
		tip.style.left = `${Math.min(px + 12, w - tip.offsetWidth - 4)}px`;
		tip.style.top = '8px';
	}

	function draw() {
		if (!state.result) return;
		drawScene();
		drawChart();
	}

	// ---------- controls ----------

	function syncSlider() {
		const slider = $('dc-position');
		slider.max = sweepFor(state.orientation).samples.length - 1;
		slider.value = state.index;
		for (const r of document.querySelectorAll('input[name="dc-orient"]')) r.checked = r.value === state.orientation;
	}

	function setOrientation(o, keepMid = true) {
		const mid = currentSample().mid;
		state.orientation = o;
		state.index = keepMid ? nearestIndex(o, mid) : worstIndex(o);
		syncSlider();
		draw();
	}

	function stop() {
		state.playing = false;
		$('dc-play').textContent = 'drive';
	}

	function play() {
		const btn = $('dc-play');
		if (state.playing) {
			stop();
			return;
		}
		const count = () => sweepFor(state.orientation).samples.length;
		if (state.index >= count() - 1) state.index = 0;
		state.playing = true;
		btn.textContent = 'pause';
		const step = () => {
			if (!state.playing) return;
			// Read the length each frame: editing the car mid-drive changes it.
			const n = count();
			state.index = Math.min(n - 1, state.index + 2);
			syncSlider();
			draw();
			if (state.index >= n - 1) {
				state.playing = false;
				btn.textContent = 'drive';
				return;
			}
			requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	}

	function bind() {
		const select = $('dc-preset');
		select.innerHTML =
			Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('') + '<option value="custom">my own measurements</option>';
		select.value = matchPreset(state.car);
		select.addEventListener('change', () => {
			if (select.value === 'custom') return;
			const { label, ...car } = PRESETS[select.value];
			state.car = car;
			writeCar(car);
			recompute();
		});

		for (const k of CAR_KEYS) {
			$(`dc-${k}`).addEventListener('input', () => {
				state.car = readCar();
				select.value = matchPreset(state.car);
				recompute();
			});
		}

		$('dc-margin').value = state.margin;
		$('dc-margin').addEventListener('input', e => {
			// NaN (blank or negative) is an input problem, not "keep the last one".
			const m = parseFloat(e.target.value);
			state.margin = Number.isFinite(m) && m >= 0 ? m : NaN;
			recompute();
		});

		$('dc-position').addEventListener('input', e => {
			state.index = +e.target.value;
			draw();
		});
		for (const r of document.querySelectorAll('input[name="dc-orient"]')) r.addEventListener('change', () => setOrientation(r.value));
		$('dc-play').addEventListener('click', play);
		$('dc-results').addEventListener('click', e => {
			const b = e.target.closest('.dc-show');
			if (b) setOrientation(b.dataset.o, false);
		});

		const chart = $('dc-chart');
		const chartX = e => {
			const rect = chart.getBoundingClientRect();
			const L = chartLayout(rect.width, rect.height);
			return { L, x: Math.max(L.xLo, Math.min(L.xHi, L.invX(e.clientX - rect.left))), y: L.invY(e.clientY - rect.top) };
		};
		chart.addEventListener('pointermove', e => {
			state.hover = chartX(e).x;
			drawChart();
		});
		chart.addEventListener('pointerleave', () => {
			state.hover = null;
			drawChart();
		});
		chart.addEventListener('click', e => {
			// Jump to the nearer of the two lines at that spot.
			const { x, y } = chartX(e);
			const o = Object.keys(ORIENT).reduce((best, k) =>
				Math.abs(sweepFor(k).samples[nearestIndex(k, x)].clearance - y) < Math.abs(sweepFor(best).samples[nearestIndex(best, x)].clearance - y) ? k : best,
			);
			state.orientation = o;
			state.index = nearestIndex(o, x);
			syncSlider();
			draw();
		});

		// Driveway table.
		$('dc-mode').value = state.mode;
		// Switching units redraws the table from the last profile that worked.
		$('dc-mode').addEventListener('change', e => {
			state.mode = e.target.value;
			state.profileError = null;
			renderProfileTable();
			recompute();
		});
		const profileEdited = () => {
			try {
				state.points = readProfileTable();
				state.profileError = null;
				return true;
			} catch (err) {
				state.profileError = err.message + '.';
				return false;
			} finally {
				recompute();
			}
		};
		$('dc-profile-body').addEventListener('input', profileEdited);
		$('dc-profile-body').addEventListener('click', e => {
			const b = e.target.closest('.dc-remove');
			if (!b) return;
			// Keep at least two driveway points (slope rows are one fewer than points).
			const rows = $('dc-profile-body').rows.length;
			if (rows - 1 + (state.mode === 'slopes' ? 1 : 0) < 2) return;
			b.closest('tr').remove();
			if (profileEdited()) renderProfileTable();
		});
		$('dc-add-row').addEventListener('click', () => {
			// Leave a half-typed table alone; add a blank row to it.
			if (state.profileError) {
				appendProfileRow(['', '']);
				profileEdited();
				return;
			}
			const last = state.points[state.points.length - 1];
			const prev = state.points[state.points.length - 2];
			// Continue the last slope for another 12 inches of run.
			const slope = (last.y - prev.y) / (last.x - prev.x);
			state.points.push({ x: last.x + 12, y: last.y + 12 * slope });
			renderProfileTable();
			recompute();
		});
		$('dc-reset-driveway').addEventListener('click', () => {
			state.points = HOME_POINTS.map(p => ({ ...p }));
			state.profileError = null;
			renderProfileTable();
			recompute();
		});
		$('dc-copy').addEventListener('click', async () => {
			if (!state.result) return;
			writeHash();
			try {
				await navigator.clipboard.writeText(location.href);
				$('dc-copy').textContent = 'copied';
			} catch {
				$('dc-copy').textContent = 'copy the address bar';
			}
			setTimeout(() => ($('dc-copy').textContent = 'copy link to this car'), 2000);
		});

		new ResizeObserver(() => draw()).observe($('dc-scene'));
		new MutationObserver(() => draw()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
	}

	function init() {
		if (!$('dc-scene')) return;
		readHash();
		writeCar(state.car);
		renderProfileTable();
		bind();
		recompute();
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
