+++
title = "hammock suspension calculator"
author = ["Elliott Claus"]
date = 2024-10-24
tags = ["reference", "ideas", "hammock", "diy"]
categories = ["notes"]
draft = false
+++

## idea: calculate all the lengths you can have with fixed length suspension {#idea-calculate-all-the-lengths-you-can-have-with-fixed-length-suspension}


### suspension lengths combined {#suspension-lengths-combined}

this page is a calculator for idea seven of the image below (sorry
for the bad quality). i tried three times to make a UCR
suspension, but i think i got cheap UHMWPE rope and it was too
slippery. so i looked up many suspension ideas and then iterated
on iterlocking loops.

{{< figure src="/images/hammock_suspension.png" >}}

the reason that i like the loops is that there is no chance for
them to let me down (assuming i made them correctly). i connect
them together by sliding one through the other. calculating how
much adjustibility i could get with four loops was difficult, so i
made this page to run the calculation for me.

if you want to know what the options are without folding a loop
(idea four), then put a number bigger than half of your biggest
loop in "minimum fold lenght". the "dogbone" vs "continuous loop"
and "minimum bury lenght" are there to calculate the total rope
needed for the suspension.


### conclusions??? {#conclusions}

an interesting thing about the numbers i ended up with is that
there is no way to get the same length using two different
combinations of rope, as long as the minimum fold length is big
enough that the two smallest lengths cannot be folded. (though now
that i'm thinking about it, this may not be a special propery, as
long as you don't double or quadruple your lengths)

the other interesting thing is that i built this suspension, and
used it once. then i realized what a hassel it was to set it up,
and i bought a $5 set of non-ratcheting straps, cut off the ends,
and used a beckett hitch to tie off. and it works great! classic
case of overthinking a problem when a $5 solution exists.


## suspension calculator {#suspension-calculator}

<button id="custom_input" onclick="customInput()"> custom input for my suspension</button>
<form id="suspensionDefinitionForm" class="test-container">
  <label for="minBuryLength">minimum bury length:</label>
  <input type="number" id="minBuryLength" required />
  <br />
  <label for="minFoldLength">minimum fold length:</label>
  <input type="number" id="minFoldLength" required />
  <br /><br />
  <div class="numbers">
    <div class="numbers">
      <label for="length1">suspension length 1:</label>
      <input type="number" id="length1" required />
      <br />
      <label for="length1type">length 1 type:</label>
      <select id="length1type">
        <option value="loop" default>continuous loop</option>
        <option value="dogbone">dogbone</option>
      </select>
    </div>
    <div class="numbers">
      <label for="length2">suspension length 2:</label>
      <input type="number" id="length2" required />
      <br />
      <label for="length2type">length 2 type:</label>
      <select id="length2type">
        <option value="loop">continuous loop</option>
        <option value="dogbone" default>dogbone</option>
      </select>
    </div>
    <div class="numbers">
      <label for="length3">suspension length 3:</label>
      <input type="number" id="length3" required />
      <br />
      <label for="length3type">length 3 type:</label>
      <select id="length3type">
        <option value="loop">continuous loop</option>
        <option value="dogbone" default>dogbone</option>
      </select>
    </div>
    <div class="numbers">
      <label for="length4">suspension length 4:</label>
      <input type="number" id="length4" required />
      <br />
      <label for="length4type">length 4 type:</label>
      <select id="length4type">
        <option value="loop">continuous loop</option>
        <option value="dogbone" default>dogbone</option>
      </select>
    </div>
  </div>
  <br /><br />
  <input type="submit" value="Calculate" />
</form>
<div class="row">
  <div id="results" class="test-container"></div>
</div>
<script src="../../js/hammock-suspension.js"></script>
