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

	// Elliott's driveway, as 12-inch slope readings from the street edge.
	// PLACEHOLDER: shaped from the old page's numbers (13 degrees, rounded
	// crest) until the driveway is measured.
	const HOME_READINGS = [0, 2, 5, 8, 11, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 11, 8, 5, 2, 0].map(degrees => ({ length: 12, degrees }));
	const HOME_POINTS = G.pointsFromSlopes(HOME_READINGS);

	const ORIENT = {
		'nose-in': { label: 'nose first', note: 'driving in forward' },
		'tail-in': { label: 'tail first', note: 'backing in' },
	};

	const $ = id => document.getElementById(id);
	const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
	const ft = inches => `${fmt(inches / 12)} ft`;

	const state = {
		car: { ...PRESETS.sedan },
		points: HOME_POINTS.map(p => ({ ...p })),
		mode: 'slopes',
		margin: 1,
		orientation: 'nose-in',
		index: 0,
		result: null,
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

	function renderProfileTable() {
		const head = state.mode === 'slopes' ? ['board length (in)', 'angle (°, + = downhill)'] : ['distance from street edge (ft)', 'height (in, − = below street)'];
		$('dc-profile-head').innerHTML = `<tr><th>#</th><th>${head[0]}</th><th>${head[1]}</th><th></th></tr>`;
		const body = $('dc-profile-body');
		body.innerHTML = '';
		profileRows().forEach((row, i) => {
			const tr = document.createElement('tr');
			tr.innerHTML =
				`<td>${i + 1}</td>` +
				`<td><input type="number" step="any" value="${row[0]}" aria-label="${head[0]}, row ${i + 1}"></td>` +
				`<td><input type="number" step="any" value="${row[1]}" aria-label="${head[1]}, row ${i + 1}"></td>` +
				`<td><button type="button" class="dc-remove" aria-label="remove row ${i + 1}">×</button></td>`;
			body.appendChild(tr);
		});
	}

	function readProfileTable() {
		const rows = [...$('dc-profile-body').querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('input')].map(i => parseFloat(i.value)));
		if (rows.some(r => r.some(v => !Number.isFinite(v)))) throw new Error('every driveway cell needs a number');
		if (state.mode === 'slopes') {
			if (rows.some(r => r[0] <= 0)) throw new Error('board lengths must be positive');
			return G.pointsFromSlopes(rows.map(([length, degrees]) => ({ length, degrees })));
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
		history.replaceState(null, '', `#${parts.join('&')}`);
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

	function describe(worst) {
		const where = `${worst.part} at ${ft(worst.at)} from the street edge`;
		if (worst.clearance < 0) return `${worst.part} hits by ${fmt(-worst.clearance)} in, ${ft(worst.at)} from the street edge`;
		return `${fmt(worst.clearance)} in to spare at the tightest spot (${where})`;
	}

	function recompute() {
		const problems = G.validateCar(state.car);
		$('dc-error').textContent = '';
		if (problems.length) {
			$('dc-error').textContent = problems.includes('length') ? 'that car is longer than this tool handles.' : 'every car measurement needs a number (wheelbase and tire size above zero).';
			return;
		}
		let result;
		try {
			result = G.analyze(state.points, state.car, 1);
		} catch (e) {
			$('dc-error').textContent = e.message + '.';
			return;
		}
		const prevMid = state.result ? currentSample().mid : null;
		state.result = result;
		state.index = prevMid === null ? worstIndex(state.orientation) : nearestIndex(state.orientation, prevMid);
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
		return sweepFor(state.orientation).samples[state.index];
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
			return `<tr class="dc-${v.kind}"><th scope="row">${ORIENT[o].label}<span class="dc-sub">${ORIENT[o].note}</span></th>` +
				`<td><span class="dc-badge" aria-hidden="true">${v.icon}</span> ${v.word}</td>` +
				`<td>${describe(w)}</td>` +
				`<td><button type="button" class="dc-show" data-o="${o}">show me</button></td></tr>`;
		});
		$('dc-results').innerHTML = rows.join('');

		const [a, b] = Object.keys(ORIENT).map(o => verdict(sweepFor(o).worst).kind);
		let head;
		if (a === 'clear' && b === 'clear') head = 'this car makes it, either direction.';
		else if (a === 'scrape' && b === 'scrape') head = 'this car scrapes, whichever way it goes in.';
		else if (a === 'scrape' || b === 'scrape') {
			const ok = a === 'scrape' ? 'tail-in' : 'nose-in';
			head = `this car scrapes one way. go in ${ORIENT[ok].label} (${ORIENT[ok].note}).`;
		} else head = 'this car makes it, but with less than ' + fmt(state.margin) + ' in to spare. go slowly.';
		$('dc-headline').textContent = head;
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
		for (const [x, label] of [[ground.start, 'street edge'], [ground.end, 'last reading']]) {
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

		$('dc-position-label').textContent = `car centre ${ft(sample.mid)} past the street edge`;
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

	function play() {
		const btn = $('dc-play');
		if (state.playing) {
			state.playing = false;
			btn.textContent = 'drive';
			return;
		}
		const n = sweepFor(state.orientation).samples.length;
		if (state.index >= n - 1) state.index = 0;
		state.playing = true;
		btn.textContent = 'pause';
		const step = () => {
			if (!state.playing) return;
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
			const m = parseFloat(e.target.value);
			if (Number.isFinite(m) && m >= 0) {
				state.margin = m;
				recompute();
			}
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
		$('dc-mode').addEventListener('change', e => {
			state.mode = e.target.value;
			renderProfileTable();
		});
		$('dc-profile-body').addEventListener('input', () => {
			try {
				state.points = readProfileTable();
				recompute();
			} catch (err) {
				$('dc-error').textContent = err.message + '.';
			}
		});
		$('dc-profile-body').addEventListener('click', e => {
			const b = e.target.closest('.dc-remove');
			if (!b) return;
			if ($('dc-profile-body').rows.length <= 2) return;
			b.closest('tr').remove();
			try {
				state.points = readProfileTable();
				renderProfileTable();
				recompute();
			} catch (err) {
				$('dc-error').textContent = err.message + '.';
			}
		});
		$('dc-add-row').addEventListener('click', () => {
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
			renderProfileTable();
			recompute();
		});
		$('dc-copy').addEventListener('click', async () => {
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
