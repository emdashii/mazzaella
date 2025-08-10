// driveway.js - Driveway scraping calculator and visualization

class DrivewayCalculator {
	constructor() {
		this.canvas = null;
		this.ctx = null;
		this.scale = 4; // pixels per inch
		this.offsetX = 400;
		this.offsetY = 200;
		this.wheelRadius = 10; // inches
	}

	init() {
		this.canvas = document.getElementById('drivewayCanvas');
		this.ctx = this.canvas.getContext('2d');
		this.setupEventListeners();
		this.calculate();
		this.draw();
	}

	setupEventListeners() {
		const inputs = ['wheelbase', 'clearance', 'angle', 'radius'];
		inputs.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				element.addEventListener('input', () => {
					this.calculate();
					this.draw();
				});
			}
		});

		const positionSlider = document.getElementById('carPosition');
		if (positionSlider) {
			positionSlider.addEventListener('input', e => {
				document.getElementById('positionValue').textContent = e.target.value;
				this.draw();
			});
		}
	}

	getValues() {
		return {
			wheelbase: parseFloat(document.getElementById('wheelbase')?.value || 108),
			clearance: parseFloat(document.getElementById('clearance')?.value || 10),
			angle: parseFloat(document.getElementById('angle')?.value || 13),
			radius: parseFloat(document.getElementById('radius')?.value || 0),
			carPosition: parseFloat(document.getElementById('carPosition')?.value || 20),
		};
	}

	// Calculation for any point on the circle given one of the other points
	// note: for this function, theta should be the slope of the line.
	angleToSlope(theta, degOrRad) {
		if (degOrRad === 'deg') {
			return Math.tan((theta * Math.PI) / 180);
		} else {
			return Math.tan(theta);
		}
	}
	circle(theta, r, x, y) {
		if (theta === 0) {
			return { x: x, y: y };
		}
		if (y === null) {
			const t2 = theta * theta;
			const r2 = r * r;
			const discriminant = t2 * (r2 * t2 - r2 + 2 * r * theta * x - t2 * x * x);
			if (discriminant < 0) {
				return { x: x, y: 0 };
			}
			const y1 = (-Math.sqrt(discriminant) - r * t2) / t2;
			// based on the geometry of this specific problem, y is always negative
			return { x: x, y: y1 };
		}
		if (x === null) {
			const t4 = theta * theta * theta * theta;
			const discriminant = -t4 * y * (2 * r + y);
			if (discriminant < 0) {
				return { x: 0, y: y };
			}
			const x1 = (r * theta - Math.sqrt(discriminant)) / (theta * theta);
			const x2 = (r * theta + Math.sqrt(discriminant)) / (theta * theta);
			return { x: x1 > x2 ? x1 : x2, y: y }; // based on the geometry of this specific problem, return the bigger x
		}
		return { x: x, y: y };
	}

	calculateHorizontalCircleEdge(radius, m) {
		// Y = 0
		if (m === 0) {
			console.log('m is 0');
			return null;
		}
		return radius / m;
	}

	findPerpendicularPoint(m, r, h, k) {
		// The line is y = mx (passes through origin)
		// We need to find point (x, y) on this line that is distance r from (h, k)

		// The perpendicular from (h, k) to line y = mx has slope -1/m
		// The foot of perpendicular is where these two lines intersect

		// Distance from point (h, k) to line y = mx is |mh - k| / sqrt(1 + m²)
		// But we want a point that's distance r from (h, k)

		// The foot of perpendicular from (h, k) to y = mx:
		// x_foot = (h + mk) / (1 + m²)
		// y_foot = m * x_foot = m(h + mk) / (1 + m²)

		const x_foot = (h + m * k) / (1 + m * m);
		const y_foot = (m * (h + m * k)) / (1 + m * m);

		// Vector from (h, k) to foot of perpendicular
		const dx_to_foot = x_foot - h;
		const dy_to_foot = y_foot - k;

		// Distance from (h, k) to foot of perpendicular
		const dist_to_foot = Math.sqrt(dx_to_foot * dx_to_foot + dy_to_foot * dy_to_foot);

		// We need to move distance r from (h, k) toward the line
		// Unit vector from (h, k) toward foot of perpendicular
		const unit_x = dx_to_foot / dist_to_foot;
		const unit_y = dy_to_foot / dist_to_foot;

		// Point that is distance r from (h, k) toward the line
		const x = h + r * unit_x;
		const y = k + r * unit_y;

		return { x: x, y: y };
	}
	calculatePerpendicularLine(originalPoint, originalSlope, newPoint) {
		// Extract coordinates
		const [x1, y1] = originalPoint;
		const [x2, y2] = newPoint;

		// Handle special cases
		if (originalSlope === 0) {
			// Original line is horizontal, perpendicular is vertical
			return {
				perpendicularSlope: Infinity,
				perpendicularYIntercept: null,
				perpendicularEquation: `x = ${x2}`,
				intersection: { x: x2, y: y2 },
			};
		}

		if (!isFinite(originalSlope)) {
			// Original line is vertical, perpendicular is horizontal
			return {
				perpendicularSlope: 0,
				perpendicularYIntercept: y2,
				perpendicularEquation: `y = ${y2}`,
				intersection: { x: x1, y: y2 },
			};
		}

		// Calculate perpendicular slope (negative reciprocal)
		const perpSlope = -1 / originalSlope;

		// Calculate y-intercept of perpendicular line: b = y - mx
		const perpYIntercept = y2 - perpSlope * x2;

		// Calculate y-intercept of original line
		const origYIntercept = y1 - originalSlope * x1;

		// Find intersection point by solving the system:
		// y = originalSlope * x + origYIntercept
		// y = perpSlope * x + perpYIntercept
		const intersectionX = (perpYIntercept - origYIntercept) / (originalSlope - perpSlope);
		const intersectionY = originalSlope * intersectionX + origYIntercept;

		return {
			perpendicularSlope: perpSlope,
			perpendicularYIntercept: perpYIntercept,
			perpendicularEquation: `y = ${perpSlope}x + ${perpYIntercept}`,
			intersection: { x: intersectionX, y: intersectionY },
		};
	}

	// Calculate ground height at given x position
	// Positive x = on road (flat), negative x = down the driveway (sloped down)
	groundHeight(x, angle, radius) {
		const angleRad = (angle * Math.PI) / 180;

		if (radius === 0) {
			// Sharp corner - no radius
			if (x >= 0) {
				return 0; // Flat road
			} else {
				// Direct slope
				return x * Math.tan(angleRad);
			}
		}

		// slope for the circle center
		const m = this.angleToSlope((180 - angle) / 2, 'deg');
		// slope for the line
		const m1 = Math.tan(angleRad);

		// Correct circle center calculation from Desmos
		const h = radius / m;
		const k = -radius;

		// Calculate tangent points
		// Right tangent point (where circle meets horizontal line y = 0)
		const rightTangentX = h;

		// Left tangent point (where circle meets the slope line)
		// Solve for intersection of circle with slope line y = x * tan(angleRad)
		// circle equation is y = +/- sqrt(r^2 - (x - h)^2) + k, where (h, k) is the circle center
		// there is an easier way to do this, get the line perpendicular to m1, that goes through (h, k). then find where the two lines intersect.
		const info = this.calculatePerpendicularLine([0, 0], m1, [h, k]);

		const leftTangentX = info.intersection.x;

		if (x >= rightTangentX) {
			// On flat road
			return 0;
		} else if (x <= leftTangentX) {
			// On sloped section
			return x * Math.tan(angleRad);
		} else {
			// On circular arc - solve circle equation for y
			// (x - h)² + (y - k)² = r²
			// y = k ± sqrt(r² - (x - h)²)
			// Take the upper solution (closer to surface)
			const underSqrt = radius * radius - (x - h) * (x - h);
			if (underSqrt < 0) return x * Math.tan(angleRad); // Shouldn't happen in valid range
			return k + Math.sqrt(underSqrt);
		}
	}
	// Get ground slope at given x position (in radians)
	getGroundSlope(x, angle, radius) {
		const angleRad = (angle * Math.PI) / 180;
		const m = this.angleToSlope((180 - angle) / 2, 'deg');

		if (radius === 0) {
			// Sharp corner
			if (x < 0) {
				return angleRad; // on the slope
			}
			return 0; // on flat road
		} else {
			// With radius - using the formula center at (r/θ, -r)
			const centerX = radius / m;
			const centerY = -radius;

			// Get tangent points
			const rightEdge = this.calculateHorizontalCircleEdge(radius, m);
			const leftEdge = this.calculatePerpendicularLine([centerX, centerY], Math.tan(angleRad), [0, 0]);

			if (x >= rightEdge) {
				// On flat road
				return 0;
			} else if (x <= leftEdge.intersection.x) {
				// On sloped section
				return angleRad;
			} else {
				// On circular arc - calculate tangent slope using derivative
				// For implicit circle equation, dy/dx = -(x - centerX)/(y - centerY)
				const y = this.circle(m, radius, x, null).y;
				const dx = x - centerX;
				const dy = y - centerY;
				if (Math.abs(dy) < 0.001) {
					// Near vertical tangent
					return Math.PI / 2;
				}
				// Tangent slope
				return Math.atan(-dx / dy);
			}
		}
	}

	// Get wheel center position (both x and y coordinates)
	// The wheel is tangent to the ground, not sitting on it
	getWheelCenter(x, angle, radius) {
		const groundY = this.groundHeight(x, angle, radius);
		const groundSlope = this.getGroundSlope(x, angle, radius);

		// For a wheel to be tangent to a surface with slope θ:
		// The wheel center must be perpendicular to the surface at distance = wheelRadius
		// Perpendicular angle = groundSlope + π/2
		const perpAngle = groundSlope + Math.PI / 2;

		// Offset wheel center by wheel radius in the perpendicular direction
		const wheelCenterX = x + this.wheelRadius * Math.cos(perpAngle);
		const wheelCenterY = groundY + this.wheelRadius * Math.sin(perpAngle);

		return { x: wheelCenterX, y: wheelCenterY };
	}

	// Calculate axle height (wheel center height)
	getAxleHeight(x, angle, radius) {
		const wheelCenter = this.getWheelCenter(x, angle, radius);
		return wheelCenter.y;
	}

	// Calculate car body height at given x position
	carBodyHeight(x, carPosition, wheelbase, angle, radius, clearance) {
		const rearAxleX = carPosition;
		const frontAxleX = carPosition + wheelbase;

		if (x < rearAxleX || x > frontAxleX) {
			return null; // Outside car bounds
		}

		const rearWheelCenter = this.getWheelCenter(rearAxleX, angle, radius);
		const frontWheelCenter = this.getWheelCenter(frontAxleX, angle, radius);

		// Linear interpolation between wheel centers
		const progress = (x - rearAxleX) / wheelbase;
		const interpolatedX = rearWheelCenter.x + progress * (frontWheelCenter.x - rearWheelCenter.x);
		const interpolatedY = rearWheelCenter.y + progress * (frontWheelCenter.y - rearWheelCenter.y);

		// Car body is clearance distance above the axle line
		return interpolatedY + clearance;
	}

	calculate() {
		const { wheelbase, clearance, angle, radius } = this.getValues();

		// Test car at current slider position
		const currentCarPosition = this.getValues().carPosition;
		const centerX = currentCarPosition + wheelbase / 2;
		const centerBodyY = this.carBodyHeight(centerX, currentCarPosition, wheelbase, angle, radius, clearance);
		const centerGroundY = this.groundHeight(centerX, angle, radius);

		// Clearance at center: distance from bottom of car to ground
		const centerClearance = centerBodyY !== null ? centerBodyY - clearance - centerGroundY : 0;

		// Check if car will scrape at current position
		const numPoints = 50;
		let minClearanceAtCurrentPos = Infinity;

		for (let i = 0; i <= numPoints; i++) {
			const x = currentCarPosition + (i / numPoints) * wheelbase;
			const carBodyY = this.carBodyHeight(x, currentCarPosition, wheelbase, angle, radius, clearance);
			const groundY = this.groundHeight(x, angle, radius);

			if (carBodyY !== null) {
				const actualClearance = carBodyY - clearance - groundY;
				if (actualClearance < minClearanceAtCurrentPos) {
					minClearanceAtCurrentPos = actualClearance;
				}
			}
		}

		const willScrape = minClearanceAtCurrentPos < 0;

		// Calculate maximum safe distance
		let maxDistance = 'No limit';
		let foundScraping = false;

		for (let testPos = 20; testPos >= -150; testPos -= 2) {
			let minClearanceAtTestPos = Infinity;

			for (let i = 0; i <= numPoints; i++) {
				const x = testPos + (i / numPoints) * wheelbase;
				const carBodyY = this.carBodyHeight(x, testPos, wheelbase, angle, radius, clearance);
				const groundY = this.groundHeight(x, angle, radius);

				if (carBodyY !== null) {
					const actualClearance = carBodyY - clearance - groundY;
					if (actualClearance < minClearanceAtTestPos) {
						minClearanceAtTestPos = actualClearance;
					}
				}
			}

			if (minClearanceAtTestPos < 0) {
				maxDistance = Math.round(Math.abs(testPos + 2) * 10) / 10 + ' inches down driveway';
				foundScraping = true;
				break;
			}
		}

		this.updateResults(willScrape, centerClearance, maxDistance);
	}

	updateResults(willScrape, centerClearance, maxDistance) {
		const elements = {
			willScrape: document.getElementById('willScrape'),
			centerClearance: document.getElementById('centerClearance'),
			maxDistance: document.getElementById('maxDistance'),
		};

		if (elements.willScrape) {
			elements.willScrape.textContent = willScrape ? 'YES' : 'NO';
			elements.willScrape.style.color = willScrape ? '#e74c3c' : '#27ae60';
		}

		if (elements.centerClearance) {
			elements.centerClearance.textContent = Math.round(centerClearance * 10) / 10 + ' inches';
		}

		if (elements.maxDistance) {
			elements.maxDistance.textContent = maxDistance;
		}
	}

	draw() {
		if (!this.ctx) return;

		const { wheelbase, clearance, angle, radius, carPosition } = this.getValues();

		// Clear canvas
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw ground
		this.drawGround(angle, radius);

		// Draw car
		this.drawCar(carPosition, wheelbase, clearance, angle, radius);

		// Draw grid and labels
		this.drawGrid();
	}

	drawGround(angle, radius) {
		this.ctx.strokeStyle = '#333';
		this.ctx.lineWidth = 3;
		this.ctx.beginPath();

		// Draw ground profile
		for (let x = -160; x <= 40; x += 1) {
			const y = this.groundHeight(x, angle, radius);
			const screenX = this.offsetX + x * this.scale;
			const screenY = this.offsetY - y * this.scale;

			if (x === -160) {
				this.ctx.moveTo(screenX, screenY);
			} else {
				this.ctx.lineTo(screenX, screenY);
			}
		}

		this.ctx.stroke();

		// Draw radius circle visualization if radius > 0
		if (radius > 0) {
			const angleRad = (angle * Math.PI) / 180;
			const m = this.angleToSlope((180 - angle) / 2, 'deg');

			// slope for the line of the angled road
			const m1 = Math.tan(angleRad);

			// Center at (r/m, -r) based on your formula, where m is in radians
			const h = radius / m;
			const k = -radius;

			// Draw the transition circle (dashed)
			this.ctx.strokeStyle = '#666';
			this.ctx.lineWidth = 1;
			this.ctx.setLineDash([3, 3]);
			this.ctx.beginPath();
			this.ctx.arc(
				this.offsetX + h * this.scale,
				this.offsetY - k * this.scale,
				radius * this.scale,
				0,
				2 * Math.PI,
			);
			this.ctx.stroke();
			this.ctx.setLineDash([]);

			// Mark tangent points
			this.ctx.fillStyle = '#e74c3c';
			// Tangent on flat road (y = 0)
			const tangentPoint1 = this.calculateHorizontalCircleEdge(radius, m);
			this.ctx.beginPath();
			this.ctx.arc(this.offsetX + tangentPoint1 * this.scale, this.offsetY, 3, 0, 2 * Math.PI);
			this.ctx.fill();

			// Tangent on slope
			const angleCircleEdge = this.calculatePerpendicularLine([0, 0], m1, [h, k]);
			console.log('angleCircleEdge');
			console.log(angleCircleEdge);

			this.ctx.beginPath();
			this.ctx.arc(
				this.offsetX + angleCircleEdge.intersection.x * this.scale,
				this.offsetY - angleCircleEdge.intersection.y * this.scale,
				3,
				0,
				2 * Math.PI,
			);
			this.ctx.fill();
		}

		// Fill ground
		this.ctx.fillStyle = '#8b451388';
		this.ctx.beginPath();
		for (let x = -160; x <= 40; x += 2) {
			const y = this.groundHeight(x, angle, radius);
			const screenX = this.offsetX + x * this.scale;
			const screenY = this.offsetY - y * this.scale;

			if (x === -160) {
				this.ctx.moveTo(screenX, screenY);
			} else {
				this.ctx.lineTo(screenX, screenY);
			}
		}

		this.ctx.lineTo(this.offsetX + 40 * this.scale, this.canvas.height);
		this.ctx.lineTo(this.offsetX - 160 * this.scale, this.canvas.height);
		this.ctx.closePath();
		this.ctx.fill();
	}

	drawCar(carPosition, wheelbase, clearance, angle, radius) {
		const rearAxleX = carPosition;
		const frontAxleX = carPosition + wheelbase;

		// Get proper wheel center positions
		const rearWheelCenter = this.getWheelCenter(rearAxleX, angle, radius);
		const frontWheelCenter = this.getWheelCenter(frontAxleX, angle, radius);

		// Draw wheels
		this.ctx.strokeStyle = '#333';
		this.ctx.lineWidth = 2;

		// Rear wheel
		this.ctx.beginPath();
		this.ctx.arc(
			this.offsetX + rearWheelCenter.x * this.scale,
			this.offsetY - rearWheelCenter.y * this.scale,
			this.wheelRadius * this.scale,
			0,
			2 * Math.PI,
		);
		this.ctx.stroke();

		// Front wheel
		this.ctx.beginPath();
		this.ctx.arc(
			this.offsetX + frontWheelCenter.x * this.scale,
			this.offsetY - frontWheelCenter.y * this.scale,
			this.wheelRadius * this.scale,
			0,
			2 * Math.PI,
		);
		this.ctx.stroke();

		// Draw axle line
		this.ctx.strokeStyle = '#666';
		this.ctx.lineWidth = 2;
		this.ctx.beginPath();
		this.ctx.moveTo(this.offsetX + rearWheelCenter.x * this.scale, this.offsetY - rearWheelCenter.y * this.scale);
		this.ctx.lineTo(this.offsetX + frontWheelCenter.x * this.scale, this.offsetY - frontWheelCenter.y * this.scale);
		this.ctx.stroke();

		// Car body line
		this.ctx.strokeStyle = '#4a90e2';
		this.ctx.lineWidth = 4;
		this.ctx.beginPath();
		this.ctx.moveTo(
			this.offsetX + rearWheelCenter.x * this.scale,
			this.offsetY - (rearWheelCenter.y + clearance) * this.scale,
		);
		this.ctx.lineTo(
			this.offsetX + frontWheelCenter.x * this.scale,
			this.offsetY - (frontWheelCenter.y + clearance) * this.scale,
		);
		this.ctx.stroke();

		// Car bottom (dashed line)
		this.ctx.strokeStyle = '#2c3e50';
		this.ctx.lineWidth = 2;
		this.ctx.setLineDash([5, 5]);
		this.ctx.beginPath();

		for (let x = rearAxleX; x <= frontAxleX; x += 2) {
			const bodyY = this.carBodyHeight(x, carPosition, wheelbase, angle, radius, clearance);
			if (bodyY !== null) {
				const bottomY = bodyY - clearance;
				const screenX = this.offsetX + x * this.scale;
				const screenY = this.offsetY - bottomY * this.scale;

				if (x === rearAxleX) {
					this.ctx.moveTo(screenX, screenY);
				} else {
					this.ctx.lineTo(screenX, screenY);
				}
			}
		}
		this.ctx.stroke();
		this.ctx.setLineDash([]);

		// Check for scraping
		for (let x = rearAxleX; x <= frontAxleX; x += 4) {
			const bodyY = this.carBodyHeight(x, carPosition, wheelbase, angle, radius, clearance);
			if (bodyY !== null) {
				const groundY = this.groundHeight(x, angle, radius);
				const bottomY = bodyY - clearance;
				const actualClearance = bottomY - groundY;

				if (actualClearance < 0) {
					// Draw scraping indicator
					this.ctx.fillStyle = '#e74c3c';
					this.ctx.fillRect(
						this.offsetX + x * this.scale - 2,
						this.offsetY - bottomY * this.scale,
						4,
						Math.abs(actualClearance * this.scale),
					);
				}
			}
		}
	}

	drawGrid() {
		this.ctx.strokeStyle = '#ddd';
		this.ctx.lineWidth = 1;

		// Vertical grid lines
		for (let x = -160; x <= 40; x += 20) {
			this.ctx.beginPath();
			this.ctx.moveTo(this.offsetX + x * this.scale, 0);
			this.ctx.lineTo(this.offsetX + x * this.scale, this.canvas.height);
			this.ctx.stroke();
		}

		// Horizontal grid lines
		for (let y = -60; y <= 20; y += 10) {
			this.ctx.beginPath();
			this.ctx.moveTo(0, this.offsetY - y * this.scale);
			this.ctx.lineTo(this.canvas.width, this.offsetY - y * this.scale);
			this.ctx.stroke();
		}

		// Labels
		this.ctx.fillStyle = '#666';
		this.ctx.font = '12px Arial';
		this.ctx.fillText('Road (0")', this.offsetX + 5, this.offsetY + 15);
		this.ctx.fillText('Start of driveway', this.offsetX - 50, this.offsetY - 5);
	}
}

// Initialize the calculator when the page loads
function initializeDrivewayCalculator() {
	const calculator = new DrivewayCalculator();
	calculator.init();
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { DrivewayCalculator, initializeDrivewayCalculator };
}
