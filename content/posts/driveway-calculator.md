+++
title = "will your car scrape on a steep driveway? calculator"
author = ["Elliott Claus"]
date = 2025-08-08
tags = ["code", "tools"]
categories = ["notes"]
draft = false
+++

## what? {#what}

this page calculates whether a car will scrape on a steep driveway transition and visualizes the car's movement through the slope.
update the parameters for your wheelbase and ground clearance and the tool will update the calculation.


## calculator {#calculator}


### inputs and results {#inputs-and-results}

<div class="driveway-calculator">
  <div class="input-section">
    <h4>car specifications</h4>
    <div class="input-group">
      <label for="wheelbase">wheelbase (inches):</label>
      <input type="number" id="wheelbase" value="108" min="80" max="200" step="1">
    </div>
    <div class="input-group">
      <label for="clearance">ground clearance (inches):</label>
      <input type="number" id="clearance" value="10" min="1" max="50" step="0.5">
    </div>
    <h3>driveway specifications</h3>
    <div class="input-group">
      <label for="angle">slope angle (degrees):</label>
      <input type="number" id="angle" value="13" min="5" max="50" step="0.2">
    </div>
    <div class="input-group">
      <label for="radius">corner radius (inches):</label>
      <input type="number" id="radius" value="200" min="0" max="900" step="1">
    </div>
  </div>
  <div class="results-section">
    <h4>analysis results</h4>
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

</div>

<script src="../../js/driveway.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  initializeDrivewayCalculator();
});
</script>


## notes {#notes}


### why? {#why}

I wrote this because I wanted to have an easy way to calculate and visualize if a car would scrape on my driveway. in the past I've felt bad when people come to visit
and I don't know if their car will scrape, but now I can just send them a link to this page and then they will know. :) my driveway has a slope of roughtly 13 degrees.


### how? {#how}

I tried to use claude to write the code. turns out that once I added the corner radius, the calculations were **hard**. ai is bad at solving systems of equations, currently.
(turns out that there were easier ways to calculate some of what I wanted, where I didn't have to use solve two equations when one of them was the formula for a circle)
I worked everything out on a whiteboard and in [desmos](https://www.desmos.com/calculator),
and then solved the equations using [wolfram alpha](https://www.wolframalpha.com/input?i2d=true&i=Power%5B%5C%2840%29x-%5C%2840%29Divide%5Br%2Ctan%5C%2840%29Divide%5B%5C%2840%29180-a%5C%2841%29%2C2%5D*Divide%5Bpi%2C180%5D%5C%2841%29%5D%5C%2841%29%5C%2841%29%2C2%5D%2BPower%5B%5C%2840%29y%2Br%5C%2841%29%2C2%5D%3DPower%5Br%2C2%5D%5C%2844%29y%3Dx*tan%5C%2840%29a*Divide%5Bpi%2C180%5D%5C%2841%29).
I spent more time on the visualization, so there are still some bugs with the yes/no calculation when there is a corner radius.
if you look at the visualization when the car is lowest, you can visually see if it will scrape or not. ¯\\_(ツ)\_/¯


### desmos screenshot {#desmos-screenshot}

from the calculations that I used to figure out the math

{{< figure src="/images/desmos20250810.png" >}}
