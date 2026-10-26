+++
title = "will your car scrape my driveway? (redone)"
author = ["Elliott Claus"]
date = 2026-10-26
tags = ["code", "tools", "ai"]
categories = ["projects"]
draft = false
+++

> **This post was written by AI, not by Elliott.** Claude (Opus 5.5) rebuilt the [original driveway calculator](/posts/driveway-calculator/) from scratch and drafted this page. Elliott plans to rewrite the words in his own voice.
>
> **The driveway shape below is still an estimate** (a 13° slope with rounded ends, from the old page). It will be replaced with real measurements.


## what it does {#what-it-does}

Pick a car, or type in your own measurements. The calculator drives that car through my driveway one inch at a time, both nose first and tail first, and finds the smallest gap between the underside of the car and the ground. If the gap goes below zero, something scrapes, and the calculator tells you what (front bumper, underbody, or rear bumper), by how much, and where.


## calculator {#calculator}

<link rel="stylesheet" href="/css/driveway-clearance.css">
<div class="dc">
  <fieldset>
    <legend>your car</legend>
    <div class="dc-row">
      <label>start from
        <select id="dc-preset"></select>
      </label>
    </div>
    <div class="dc-car">
      <label>wheelbase (in) <input type="number" id="dc-wheelbase" min="1" step="0.5"></label>
      <label>tire diameter (in) <input type="number" id="dc-tireDiameter" min="1" step="0.1"></label>
      <label>front overhang (in) <input type="number" id="dc-frontOverhang" min="0" step="0.5"></label>
      <label>front bumper height (in) <input type="number" id="dc-frontHeight" min="0" step="0.1"></label>
      <label>rear overhang (in) <input type="number" id="dc-rearOverhang" min="0" step="0.5"></label>
      <label>rear bumper height (in) <input type="number" id="dc-rearHeight" min="0" step="0.1"></label>
      <label>underbody clearance (in) <input type="number" id="dc-clearance" min="0" step="0.1"></label>
      <label>safety margin (in) <input type="number" id="dc-margin" min="0" step="0.25"></label>
    </div>
    <p class="dc-note">from these: <span id="dc-angles"></span>. presets are rough shapes, not specific models. measure your car for a real answer (see below).</p>
  </fieldset>

  <p id="dc-error" class="dc-error" role="alert"></p>
  <p id="dc-headline" class="dc-headline" aria-live="polite"></p>
  <table class="dc-results"><tbody id="dc-results"></tbody></table>

  <canvas id="dc-scene" class="dc-scene" role="img" aria-label="side view of the car on the driveway"></canvas>
  <div class="dc-row">
    <fieldset class="dc-row dc-orient">
      <legend class="dc-note">direction</legend>
      <label><input type="radio" name="dc-orient" value="nose-in" checked> nose first</label>
      <label><input type="radio" name="dc-orient" value="tail-in"> tail first</label>
    </fieldset>
    <button type="button" id="dc-play">drive</button>
    <input type="range" id="dc-position" min="0" max="1" value="0" aria-label="car position">
  </div>
  <p id="dc-position-label" class="dc-note"></p>

  <div class="dc-chart-wrap">
    <canvas id="dc-chart" class="dc-chart" role="img" aria-label="smallest clearance as the car moves along the driveway, for both directions"></canvas>
    <div id="dc-tip" class="dc-tip" hidden></div>
  </div>
  <div class="dc-legend">
    <span><i class="dc-key dc-key-nose-in"></i>nose first</span>
    <span><i class="dc-key dc-key-tail-in"></i>tail first</span>
    <span>smallest gap under the car, by where the car's centre is. below the red line, it scrapes. click to jump there.</span>
  </div>

  <p class="dc-row dc-share"><button type="button" id="dc-copy">copy link to this car</button></p>

  <details>
    <summary>the driveway</summary>
    <p class="dc-note">the profile runs from the street edge toward the garage, with flat ground added before the first reading and after the last. edit it to check a different driveway.</p>
    <div class="dc-row">
      <label>enter as
        <select id="dc-mode">
          <option value="slopes">slope readings (board + level)</option>
          <option value="heights">heights (string line)</option>
        </select>
      </label>
      <button type="button" id="dc-add-row">add row</button>
      <button type="button" id="dc-reset-driveway">reset to my driveway</button>
    </div>
    <div class="dc-profile-scroll">
      <table class="dc-profile"><thead id="dc-profile-head"></thead><tbody id="dc-profile-body"></tbody></table>
    </div>
  </details>
</div>
<script src="/js/driveway-geometry.js"></script>
<script src="/js/driveway-clearance.js"></script>


## measuring your car {#measuring-your-car}

Park on flat ground and use a tape measure. All measurements are in inches.

-   **wheelbase**: centre of the front wheel to centre of the rear wheel. Spec sheets list this.
-   **tire diameter**: ground to the top of the tire. You can also work it out from the sidewall: 225/45R17 is 17 + 2 × 225 × 0.45 / 25.4 ≈ 25 in.
-   **front overhang**: centre of the front wheel, forward to the lowest part of the front bumper or splitter. Measure to the low edge that could hit, not to the very tip of the bumper.
-   **front bumper height**: ground to that same low edge.
-   **rear overhang** and **rear bumper height**: the same at the back. Hitches and exhaust tips count.
-   **underbody clearance**: the lowest point between the wheels, usually the exhaust, a skid plate, or the side skirts. The ground clearance on a spec sheet is usually this number, measured unloaded.
-   **safety margin**: anything closer than this is marked "too close to call". The default is 1 in, because a rigid model ignores the suspension. Passengers, luggage, and the bounce from crossing a gutter all push the car lower.

The line under the inputs shows the approach, departure, and breakover angles that these measurements imply. If your car's spec sheet lists those angles, compare them to check your measurements.


## how it works {#how-it-works}

The old version modelled a straight slope meeting the street with one rounded corner, and treated the car as a line between the axles. This one works from a measured profile and a car with real dimensions.

-   **the driveway** is a list of points. You can enter it as slope readings (a level on a board laid end to end down the driveway) or as heights (a level string line and a tape measure). Flat ground extends past both ends so the car starts and finishes level.
-   **the tires** are circles that roll on that profile. At a sharp edge, a tire rides over the corner instead of dropping into it, so a real tire scrapes a little less than a point would.
-   **the wheels** are a wheelbase apart. For each rear-wheel position, the calculator searches (by bisection) for the spot where the other tire touches the ground at exactly that distance. This replaces the circle-and-line algebra that the old page solved by hand in Desmos and Wolfram Alpha, and it works on any profile shape, not only a slope plus one arc.
-   **the underside** is four points in the car's frame: rear bumper, underbody at each axle, front bumper. The calculator rotates them with the car, checks the vertical gap to the ground every inch along the car, and keeps the smallest.
-   **both directions**: driving in nose first and backing in are different problems, because the front and rear overhangs differ. A long, low bumper usually hits where downhill changes to flat (the sag). The underbody usually hits where the street tips over into the slope (the crest).

The geometry code has tests against the textbook formulas. Over a sharp crest with point tires, the underbody gap must equal c − (L/2)·tan(θ/2). At a sharp sag, the bumper gap must equal h − overhang·tan(θ). The model matches both to within 0.05 in.


## what it doesn't model {#what-it-doesn-t-model}

-   Suspension. The car is rigid at its parked ride height. That's what the safety margin is for.
-   Side-to-side tilt. If you enter the driveway at an angle, one wheel drops before the other and a corner of the bumper sits lower than its centre. Entering at an angle sometimes saves a scraping car, and sometimes makes a tight one scrape.
-   Bumper shape. The underside is straight lines between the four points. A lip that hangs below the line from the bumper to the axle needs its own overhang and height.


## measuring the driveway {#measuring-the-driveway}

For anyone who wants to use this on their own driveway (and for me, since mine is still an estimate):

1.  Pick the line that tires actually follow, starting at the street edge where the gutter meets the driveway.
2.  _Slope readings:_ lay a straight 12 in board on the driveway and read the angle with a level app on your phone (downhill is positive). Move the board forward by its own length and repeat until you reach flat ground. Use a short board: a long one averages out the sharp edges that cause scrapes.
3.  _Heights:_ tie a string at the street end, level it with a line level, and measure from the string down to the driveway every 6–12 in. Subtract the first reading from each one, and enter the result as a negative height.
4.  Include a few readings on the street before the edge if there is a gutter dip, and keep going until the driveway has been flat for at least the length of a car.


## the prompt {#the-prompt}

This is the request that started the rebuild, unedited:

```markdown
I have a driveway calculator page, and I want you to use that as inspiration for a new page, completely redone from scratch. I used some hand math and the agents available at the time to make it, and I want to remake it with the current state of the art agents, which you are, opus 5.5. so this should be a new post. if you need me to give you any additional information to be able to do a better job, I can take measurements and stuff on the driveway.
```
