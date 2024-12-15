+++
title = "hours calculator"
author = ["Elliott Claus"]
date = 2024-09-10
tags = ["code", "javascript", "reference"]
categories = ["notes"]
draft = false
+++

## a touch of motivation to see if i'm on track {#a-touch-of-motivation-to-see-if-i-m-on-track}


### Calculator Form {#calculator-form}

<form id="workHoursForm" class="test-container">
  <label for="workedHours">Monthly Hours Worked:</label>
  <input type="number" id="workedHours" required />
  <br />
  <label for="hourlyGoal">Monthly Hourly Goal:</label>
  <input type="number" id="hourlyGoal" required />
  <br />
  <label for="dailyGoal">Ideal Hours/Day:</label>
  <input type="number" id="dailyGoal" required />
  <br />
  <label for="hourlyRate">Hourly Rate:</label>
  <input type="number" id="hourlyRate" />
  <br />
  <input type="submit" value="Calculate" />
</form>


### Results {#results}

<div id="results" class="test-container"></div>
<script src="../../js/hours-calculator.js"></script>
