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

		// With radius: create a circle tangent to both lines
		// The center must be at perpendicular distance 'radius' from both lines

		// For a horizontal line (y = 0) and a sloped line through origin with angle θ:
		// The center lies on the angle bisector at angle θ/2 from horizontal
		// Distance from center to each line must equal radius

		// The center is offset from the corner (0,0) along the bisector
		// Bisector angle from horizontal = θ/2
		const bisectorAngle = angleRad / 2;

		// Distance along bisector from corner to center
		// Using geometry: distance = radius / sin(θ/2)
		const distanceToCenter = radius / Math.sin(angleRad / 2);

		// Center coordinates
		const centerX = -distanceToCenter * Math.cos(bisectorAngle);
		const centerY = -distanceToCenter * Math.sin(bisectorAngle);

		// Find tangent points
		// For horizontal line: perpendicular from center to y=0
		const tangentX1 = centerX;

		// For sloped line: perpendicular from center to line
		// Using perpendicular projection formula
		const slopeNormalX = Math.sin(angleRad);
		const slopeNormalY = -Math.cos(angleRad);
		const t = -(centerX * slopeNormalX + centerY * slopeNormalY);
		const tangentX2 = centerX + t * slopeNormalX;
		const tangentY2 = centerY + t * slopeNormalY;

		if (x >= tangentX1) {
			// On flat road
			return 0;
		} else if (x <= tangentX2) {
			// On sloped section
			return x * Math.tan(angleRad);
		} else {
			// On circular arc
			const dx = x - centerX;
			const discriminant = radius * radius - dx * dx;
			if (discriminant < 0) {
				// Outside circle bounds
				return x < 0 ? x * Math.tan(angleRad) : 0;
			}
			// Upper arc of circle (taking the higher y value)
			return centerY + Math.sqrt(discriminant);
		}
	}

	// Get ground slope at given x position (in radians)
	getGroundSlope(x, angle, radius) {
		const angleRad = (angle * Math.PI) / 180;

		if (radius === 0) {
			// Sharp corner
			if (x < 0) {
				return angleRad; // on the slope
			}
			return 0; // on flat road
		} else {
			// With radius - recalculate center and tangent points
			const bisectorAngle = angleRad / 2;
			const distanceToCenter = radius / Math.sin(angleRad / 2);
			const centerX = -distanceToCenter * Math.cos(bisectorAngle);
			const centerY = -distanceToCenter * Math.sin(bisectorAngle);

			const tangentX1 = centerX;

			const slopeNormalX = Math.sin(angleRad);
			const slopeNormalY = -Math.cos(angleRad);
			const t = -(centerX * slopeNormalX + centerY * slopeNormalY);
			const tangentX2 = centerX + t * slopeNormalX;

			if (x >= tangentX1) {
				// On flat road
				return 0;
			} else if (x <= tangentX2) {
				// On sloped section
				return angleRad;
			} else {
				// On circular arc - calculate tangent slope
				const dx = x - centerX;
				const discriminant = radius * radius - dx * dx;
				if (discriminant <= 0) {
					return x < centerX ? angleRad : 0;
				}
				const dy = Math.sqrt(discriminant);
				// Tangent slope to circle at this point
				// For upper arc: dy/dx = -dx/dy
				return Math.atan(dx / dy);
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
			const bisectorAngle = angleRad / 2;
			const distanceToCenter = radius / Math.sin(angleRad / 2);
			const centerX = -distanceToCenter * Math.cos(bisectorAngle);
			const centerY = -distanceToCenter * Math.sin(bisectorAngle);

			// Draw the transition circle (dashed)
			this.ctx.strokeStyle = '#666';
			this.ctx.lineWidth = 1;
			this.ctx.setLineDash([3, 3]);
			this.ctx.beginPath();
			this.ctx.arc(
				this.offsetX + centerX * this.scale,
				this.offsetY - centerY * this.scale,
				radius * this.scale,
				0,
				2 * Math.PI,
			);
			this.ctx.stroke();
			this.ctx.setLineDash([]);

			// Mark tangent points
			this.ctx.fillStyle = '#e74c3c';
			// Tangent on flat road
			this.ctx.beginPath();
			this.ctx.arc(this.offsetX + centerX * this.scale, this.offsetY, 3, 0, 2 * Math.PI);
			this.ctx.fill();

			// Tangent on slope
			const slopeNormalX = Math.sin(angleRad);
			const slopeNormalY = -Math.cos(angleRad);
			const t = -(centerX * slopeNormalX + centerY * slopeNormalY);
			const tangentX2 = centerX + t * slopeNormalX;
			const tangentY2 = centerY + t * slopeNormalY;
			this.ctx.beginPath();
			this.ctx.arc(
				this.offsetX + tangentX2 * this.scale,
				this.offsetY - tangentY2 * this.scale,
				3,
				0,
				2 * Math.PI,
			);
			this.ctx.fill();
		}

		// Fill ground
		this.ctx.fillStyle = '#8b4513';
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
