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
		const inputs = ['wheelbase', 'clearance', 'angle', 'transition'];
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
			transition: parseFloat(document.getElementById('transition')?.value || 0),
			carPosition: parseFloat(document.getElementById('carPosition')?.value || 20),
		};
	}

	// Calculate ground height at given x position
	// Positive x = on road (flat), negative x = down the driveway (sloped down)
	groundHeight(x, angle, transitionDistance) {
		const angleRad = (angle * Math.PI) / 180;

		if (x >= 0) {
			return 0; // Flat road
		} else if (x > -transitionDistance) {
			// Gradual transition downward
			const progress = -x / transitionDistance; // 0 to 1
			const smoothProgress = progress * progress * (3 - 2 * progress); // smooth step
			return -smoothProgress * transitionDistance * Math.tan(angleRad);
		} else {
			// Full downward slope
			const slopeStart = -transitionDistance;
			const baseHeight = -transitionDistance * Math.tan(angleRad);
			return baseHeight + (x - slopeStart) * Math.tan(angleRad);
		}
	}

	// Calculate wheel contact points (bottom of wheel touches ground)
	getWheelContactY(x, angle, transitionDistance) {
		return this.groundHeight(x, angle, transitionDistance);
	}

	// Calculate axle height (wheel contact + wheel radius)
	getAxleHeight(x, angle, transitionDistance) {
		return this.getWheelContactY(x, angle, transitionDistance) + this.wheelRadius;
	}

	// Calculate car body height at given x position (axle height + clearance)
	carBodyHeight(x, carPosition, wheelbase, angle, transitionDistance, clearance) {
		const rearAxleX = carPosition;
		const frontAxleX = carPosition + wheelbase;

		if (x < rearAxleX || x > frontAxleX) {
			return null; // Outside car bounds
		}

		const rearAxleY = this.getAxleHeight(rearAxleX, angle, transitionDistance);
		const frontAxleY = this.getAxleHeight(frontAxleX, angle, transitionDistance);

		const progress = (x - rearAxleX) / wheelbase;
		const axleHeight = rearAxleY + progress * (frontAxleY - rearAxleY);

		return axleHeight + clearance;
	}

	calculate() {
		const { wheelbase, clearance, angle, transition } = this.getValues();
		this.wheelRadius = clearance;

		// Test car at current slider position for center clearance
		const currentCarPosition = this.getValues().carPosition;
		const centerX = currentCarPosition + wheelbase / 2;
		const centerBodyY = this.carBodyHeight(centerX, currentCarPosition, wheelbase, angle, transition, clearance);
		const centerGroundY = this.groundHeight(centerX, angle, transition);
		const centerClearance = centerBodyY - clearance - centerGroundY; // bottom of car minus ground

		// Check if car will scrape anywhere along its length at current position
		const numPoints = 50;
		let minClearanceAtCurrentPos = Infinity;

		for (let i = 0; i <= numPoints; i++) {
			const x = currentCarPosition + (i / numPoints) * wheelbase;
			const carBodyY = this.carBodyHeight(x, currentCarPosition, wheelbase, angle, transition, clearance);
			const groundY = this.groundHeight(x, angle, transition);

			if (carBodyY !== null) {
				const actualClearance = carBodyY - clearance - groundY; // bottom of car minus ground
				if (actualClearance < minClearanceAtCurrentPos) {
					minClearanceAtCurrentPos = actualClearance;
				}
			}
		}

		const willScrape = minClearanceAtCurrentPos < 0;

		// Calculate maximum safe distance by testing positions
		let maxDistance = 'No limit';
		let foundScraping = false;

		// Test positions from road down the driveway
		for (let testPos = 20; testPos >= -150; testPos -= 2) {
			let minClearanceAtTestPos = Infinity;

			for (let i = 0; i <= numPoints; i++) {
				const x = testPos + (i / numPoints) * wheelbase;
				const carBodyY = this.carBodyHeight(x, testPos, wheelbase, angle, transition, clearance);
				const groundY = this.groundHeight(x, angle, transition);

				if (carBodyY !== null) {
					const actualClearance = carBodyY - clearance - groundY;
					if (actualClearance < minClearanceAtTestPos) {
						minClearanceAtTestPos = actualClearance;
					}
				}
			}

			if (minClearanceAtTestPos < 0) {
				// Found first scraping position
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

		const { wheelbase, clearance, angle, transition, carPosition } = this.getValues();

		// Clear canvas
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw ground
		this.drawGround(angle, transition);

		// Draw car
		this.drawCar(carPosition, wheelbase, clearance, angle, transition);

		// Draw grid and labels
		this.drawGrid();
	}

	drawGround(angle, transition) {
		this.ctx.strokeStyle = '#333';
		this.ctx.lineWidth = 3;
		this.ctx.beginPath();

		// Draw ground profile (road flat, driveway goes down)
		for (let x = -160; x <= 40; x += 2) {
			const y = this.groundHeight(x, angle, transition);
			const screenX = this.offsetX + x * this.scale;
			const screenY = this.offsetY - y * this.scale;

			if (x === -160) {
				this.ctx.moveTo(screenX, screenY);
			} else {
				this.ctx.lineTo(screenX, screenY);
			}
		}

		this.ctx.stroke();

		// Fill ground
		this.ctx.fillStyle = '#8b4513';
		this.ctx.beginPath();
		for (let x = -160; x <= 40; x += 2) {
			const y = this.groundHeight(x, angle, transition);
			const screenX = this.offsetX + x * this.scale;
			const screenY = this.offsetY - y * this.scale;

			if (x === -160) {
				this.ctx.moveTo(screenX, screenY);
			} else {
				this.ctx.lineTo(screenX, screenY);
			}
		}

		// Complete the fill
		this.ctx.lineTo(this.offsetX + 40 * this.scale, this.canvas.height);
		this.ctx.lineTo(this.offsetX - 160 * this.scale, this.canvas.height);
		this.ctx.closePath();
		this.ctx.fill();
	}

	drawCar(carPosition, wheelbase, clearance, angle, transition) {
		const rearAxleX = carPosition;
		const frontAxleX = carPosition + wheelbase;

		// Get axle heights (wheel contact + wheel radius)
		const rearAxleY = this.getAxleHeight(rearAxleX, angle, transition);
		const frontAxleY = this.getAxleHeight(frontAxleX, angle, transition);

		// Draw wheels (circles with bottom touching ground)
		this.ctx.fillStyle = '#333';
		this.ctx.strokeStyle = '#333';
		this.ctx.lineWidth = 2;

		// Rear wheel
		this.ctx.beginPath();
		this.ctx.arc(
			this.offsetX + rearAxleX * this.scale,
			this.offsetY - rearAxleY * this.scale,
			this.wheelRadius * this.scale,
			0,
			2 * Math.PI,
		);
		this.ctx.stroke();

		// Front wheel
		this.ctx.beginPath();
		this.ctx.arc(
			this.offsetX + frontAxleX * this.scale,
			this.offsetY - frontAxleY * this.scale,
			this.wheelRadius * this.scale,
			0,
			2 * Math.PI,
		);
		this.ctx.stroke();

		// Draw axle line (connecting wheel centers)
		this.ctx.strokeStyle = '#666';
		this.ctx.lineWidth = 2;
		this.ctx.beginPath();
		this.ctx.moveTo(this.offsetX + rearAxleX * this.scale, this.offsetY - rearAxleY * this.scale);
		this.ctx.lineTo(this.offsetX + frontAxleX * this.scale, this.offsetY - frontAxleY * this.scale);
		this.ctx.stroke();

		// Car body line (clearance distance above axle line)
		this.ctx.strokeStyle = '#4a90e2';
		this.ctx.lineWidth = 4;
		this.ctx.beginPath();
		this.ctx.moveTo(this.offsetX + rearAxleX * this.scale, this.offsetY - (rearAxleY + clearance) * this.scale);
		this.ctx.lineTo(this.offsetX + frontAxleX * this.scale, this.offsetY - (frontAxleY + clearance) * this.scale);
		this.ctx.stroke();

		// Car bottom (clearance line) - dashed line showing lowest point
		this.ctx.strokeStyle = '#2c3e50';
		this.ctx.lineWidth = 2;
		this.ctx.setLineDash([5, 5]);
		this.ctx.beginPath();

		for (let x = rearAxleX; x <= frontAxleX; x += 2) {
			const bodyY = this.carBodyHeight(x, carPosition, wheelbase, angle, transition, clearance);
			const bottomY = bodyY - clearance;
			const screenX = this.offsetX + x * this.scale;
			const screenY = this.offsetY - bottomY * this.scale;

			if (x === rearAxleX) {
				this.ctx.moveTo(screenX, screenY);
			} else {
				this.ctx.lineTo(screenX, screenY);
			}
		}
		this.ctx.stroke();
		this.ctx.setLineDash([]);

		// Check for scraping and highlight problem areas
		for (let x = rearAxleX; x <= frontAxleX; x += 4) {
			const bodyY = this.carBodyHeight(x, carPosition, wheelbase, angle, transition, clearance);
			const groundY = this.groundHeight(x, angle, transition);
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
		this.ctx.fillText('Road (0")', this.offsetX - 5, this.offsetY + 15);
		this.ctx.fillText('Start of driveway', this.offsetX - 5, this.offsetY - 5);
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
