document.addEventListener('DOMContentLoaded', function () {
	const form = document.getElementById('workHoursForm');
	const results = document.getElementById('results');

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		calculateWorkHours();
		document.querySelectorAll('p').forEach(p => {
			const content = p.textContent;
			const highlighted = content.replace(/\d+(?:\.\d+)?/g, match => `<span class="number">${match}</span>`);
			p.innerHTML = highlighted;
		});
	});

	function calculateWorkHours() {
		const workedHours = parseFloat(document.getElementById('workedHours').value);
		const hourlyGoal = parseFloat(document.getElementById('hourlyGoal').value);
		const dailyGoal = parseFloat(document.getElementById('dailyGoal').value);
		const hourlyRate = parseFloat(document.getElementById('hourlyRate').value);

		const now = new Date();
		const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		const beginningOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		let remainingWorkDays = 0;
		let totalWorkDays = 0;

		for (let d = now; d <= lastDay; d.setDate(d.getDate() + 1)) {
			if (d.getDay() !== 0 && d.getDay() !== 6) remainingWorkDays++;
		}
		for (let d = beginningOfMonth; d <= lastDay; d.setDate(d.getDate() + 1)) {
			if (d.getDay() !== 0 && d.getDay() !== 6) totalWorkDays++;
		}

		const totalMonthlyHours = hourlyGoal;
		const remainingHours = totalMonthlyHours - workedHours;
		const dailyRequired = remainingHours / remainingWorkDays;
		const onTrack = dailyRequired <= dailyGoal;
		const monthlyHoursAtCurrentRate =
			workedHours + (remainingWorkDays * workedHours) / (totalWorkDays - remainingWorkDays);
		const monthlyHoursAtTargetRate = remainingWorkDays * dailyGoal + workedHours;

		let resultHtml = `
    <p class="${onTrack ? 'on-track' : 'behind-schedule'}">
        Status: ${onTrack ? 'On track' : 'Behind schedule'}
    </p>
    <p>Remaining work days this month: ${remainingWorkDays}</p>
    <p>Remaining hours to work: ${remainingHours.toFixed(2)}</p>
    <p>At this rate, you will work ${monthlyHoursAtCurrentRate.toFixed(2)} hours this month, making $${(
			monthlyHoursAtCurrentRate * hourlyRate
		).toFixed(2)}.</p>
    <p>At your target hours/day, you will work ${monthlyHoursAtTargetRate.toFixed(2)} hours this month, making $${(
			monthlyHoursAtTargetRate * hourlyRate
		).toFixed(2)}.</p>
    <p>Average daily hours worked so far: ${(workedHours / (totalWorkDays - remainingWorkDays)).toFixed(2)}</p>
    <p>Days already worked: ${totalWorkDays - remainingWorkDays}</p>
    <p>Money already earned: $${(workedHours * hourlyRate).toFixed(2)}</p>
        `;

		if (!onTrack) {
			resultHtml += `
      <p>To get back on track, work ${dailyRequired.toFixed(2)} hours each remaining work day.</p>
            `;
		} else {
			resultHtml += `<p>To stay on track to meet your Monthly Hourly Goal, work ${dailyRequired.toFixed(
				2,
			)} hours each remaining work day.</p>`;
		}

		results.innerHTML = resultHtml;
	}
});
