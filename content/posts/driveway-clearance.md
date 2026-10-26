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
> The driveway profile is measured: Elliott's numbers, taken with a 2 ft level and a tape measure (see [my driveway](#my-driveway)).


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
    <p class="dc-note">the profile runs from the street toward the house. past the first and last reading it continues at the same slope. edit it to check a different driveway.</p>
    <div class="dc-row">
      <label>enter as
        <select id="dc-mode">
          <option value="heights">heights (level and tape)</option>
          <option value="slopes">slope readings (board and level app)</option>
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

-   **the driveway** is a list of points. You can enter it as heights (a level and a tape measure) or as slope readings (a level app on a board). Past the first and last reading, the profile continues at the same slope, so a driveway measured only partway down doesn't grow a fake dip at the end.
-   **the tires** are circles that roll on that profile. At a sharp edge, a tire rides over the corner instead of dropping into it, so a real tire scrapes a little less than a point would.
-   **the wheels** are a wheelbase apart. For each rear-wheel position, the calculator searches (by bisection) for the spot where the other tire touches the ground at exactly that distance. This replaces the circle-and-line algebra that the old page solved by hand in Desmos and Wolfram Alpha, and it works on any profile shape, not only a slope plus one arc.
-   **the underside** is four points in the car's frame: rear bumper, underbody at each axle, front bumper. The calculator rotates them with the car, checks the vertical gap to the ground every inch along the car, and keeps the smallest.
-   **both directions**: driving in nose first and backing in are different problems, because the front and rear overhangs differ. A long, low bumper usually hits where downhill changes to flat (the sag). The underbody usually hits where the street tips over into the slope (the crest).

The geometry code has tests against the textbook formulas. Over a sharp crest with point tires, the underbody gap must equal c − (L/2)·tan(θ/2). At a sharp sag, the bumper gap must equal h − overhang·tan(θ). The model matches both to within 0.05 in.


## what it doesn't model {#what-it-doesn-t-model}

-   Suspension. The car is rigid at its parked ride height. That's what the safety margin is for.
-   Side-to-side tilt. If you enter the driveway at an angle, one wheel drops before the other and a corner of the bumper sits lower than its centre. Entering at an angle sometimes saves a scraping car, and sometimes makes a tight one scrape.
-   Anything past the last reading. The profile continues at the last slope, so a dip or level-out beyond your measurements isn't checked.
-   Bumper shape. The underside is straight lines between the four points. A lip that hangs below the line from the bumper to the axle needs its own overhang and height.


## my driveway {#my-driveway}

Elliott measured the left tire track with a 2 ft level and a tape measure. He rested one end of the level on the driveway, held it level pointing downhill, and measured the drop from the free end to the ground. Then he moved the level to where the tape landed and repeated. The first reading starts on a patch hump at the street edge, less than 1 in above the street. The calculator assumes the street is flat and 3/4 in below the hump; that part wasn't measured.

| step | along (ft) | drop (in) | below the hump (in) | slope |
|------|------------|-----------|---------------------|-------|
| 1    | 0–2        | 3.5       | 3.5                 | 8.3°  |
| 2    | 2–4        | 6         | 9.5                 | 14.0° |
| 3    | 4–6        | 5.25      | 14.75               | 12.3° |
| 4    | 6–8        | 5.75      | 20.5                | 13.5° |
| 5    | 8–10       | 5         | 25.5                | 11.8° |
| 6    | 10–12      | 5.5       | 31                  | 12.9° |
| 7    | 12–14      | 6         | 37                  | 14.0° |
| 8    | 14–16      | 6         | 43                  | 14.0° |
| 9    | 16–18      | 5.5       | 48.5                | 12.9° |
| 10   | 18–20      | 5         | 53.5                | 11.8° |
| 11   | 20–22      | 4         | 57.5                | 9.5°  |
| 12   | 22–24      | 4         | 61.5                | 9.5°  |
| 13   | 24–26      | 3.75      | 65.25               | 8.9°  |

The old page's guess of 13° was about right for the middle. What it missed is the top: the street rises slightly to the hump, then the driveway drops 8° in the first 2 ft and 14° in the next 2. That's a sharp crest, and a sharp crest catches the underbody between the wheels.

The readings stop 26 ft down, still sloping about 9°, where any car is well past the top. The calculator continues that slope, so it answers the question at the top only. The bottom, where the driveway levels out, isn't measured, and a long, low bumper could still scrape there.


## measuring a driveway {#measuring-a-driveway}

The same method works on any driveway. You need a level and a tape measure:

1.  Start on the street, a few feet before the driveway, on the line the tires follow.
2.  Rest one end of a 2 ft level on the ground, point it down the driveway, and hold it level.
3.  Measure straight down from the free end to the ground. Write it down.
4.  Move the resting end to where the tape touched, and repeat until the driveway levels out, or until a car would be all the way past the top.
5.  In the calculator, open _the driveway_, choose _heights_, and enter one point per reading: each point is 2 ft further along than the last, and its height is the previous height minus the drop you measured.

In the flat middle of a driveway, a 4 ft level is fine. Near the top and bottom, use the short one; a long level bridges over the sharp edges that cause scrapes.


## the prompt {#the-prompt}

This is the request that started the rebuild, unedited:

```markdown
I have a driveway calculator page, and I want you to use that as inspiration for a new page, completely redone from scratch. I used some hand math and the agents available at the time to make it, and I want to remake it with the current state of the art agents, which you are, opus 5.5. so this should be a new post. if you need me to give you any additional information to be able to do a better job, I can take measurements and stuff on the driveway.
```
