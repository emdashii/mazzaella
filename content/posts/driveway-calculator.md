+++
title = "driveway scraping calculator"
author = ["Elliott Claus"]
date = 2025-08-08
tags = ["code", "tools"]
categories = ["tools"]
draft = false
+++

## driveway scraping analysis {#driveway-scraping-analysis}

this tool calculates whether a car will scrape on a steep driveway transition and visualizes the car's movement through the slope.
I wrote it because I wanted to have an easy way to calculate and visualize if a car would scrape on my driveway. it was mostly built for fun with claude.


### calculator inputs {#calculator-inputs}

<div class="driveway-calculator">
  <div class="input-section">
    <h3>car specifications</h3>
    <div class="input-group">
      <label for="wheelbase">wheelbase (inches):</label>
      <input type="number" id="wheelbase" value="108" min="80" max="180" step="1">
    </div>
    <div class="input-group">
      <label for="clearance">ground clearance (inches):</label>
      <input type="number" id="clearance" value="10" min="3" max="28" step="0.5">
    </div>
    <h3>driveway specifications</h3>
    <div class="input-group">
      <label for="angle">slope angle (degrees):</label>
      <input type="number" id="angle" value="13" min="5" max="30" step="0.5">
    </div>
    <div class="input-group">
      <label for="transition">transition distance (inches):</label>
      <input type="number" id="transition" value="0" min="0" max="60" step="6">
      <small>distance over which the slope gradually changes from flat</small>
    </div>
  </div>
  <div class="results-section">
    <h3>analysis results</h3>
    <div id="results">
      <div class="result-item">
        <span class="label">will scrape:</span>
        <span id="willScrape" class="value">calculating...</span>
      </div>
      <div class="result-item">
        <span class="label">clearance at center:</span>
        <span id="centerClearance" class="value">calculating...</span>
      </div>
      <div class="result-item">
        <span class="label">max safe distance:</span>
        <span id="maxDistance" class="value">calculating...</span>
      </div>
    </div>
  </div>
</div>


### interactive visualization {#interactive-visualization}

<div class="visualization-section">
  <h3>car movement simulation</h3>
  <div class="controls">
    <label for="carPosition">car position:</label>
    <input type="range" id="carPosition" min="-180" max="30" value="-50" step="2">
    <span id="positionValue">-50</span> inches
  </div>

  <div class="canvas-container">
    <canvas id="drivewayCanvas" width="800" height="400"></canvas>
  </div>

  <div class="legend">
    <div class="legend-item">
      <div class="legend-color" style="background: #333;"></div>
      <span>ground profile</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #4a90e2;"></div>
      <span>car body</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #e74c3c;"></div>
      <span>scraping zone</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #27ae60;"></div>
      <span>safe clearance</span>
    </div>
  </div>
</div>

<script src="../../js/driveway.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  initializeDrivewayCalculator();
});
</script>
