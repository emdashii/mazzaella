function customInput() {
	document.getElementById('minFoldLength').value = 20;
	document.getElementById('minBuryLength').value = 5;
	document.getElementById('length1').value = 6;
	document.getElementById('length2').value = 12;
	document.getElementById('length3').value = 40;
	document.getElementById('length4').value = 110;
	document.getElementById('length1type').value = 'loop';
	document.getElementById('length2type').value = 'loop';
	document.getElementById('length3type').value = 'dogbone';
	document.getElementById('length4type').value = 'dogbone';
}
document.addEventListener('DOMContentLoaded', function () {
	const form = document.getElementById('suspensionDefinitionForm');
	const results = document.getElementById('results');
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		calculateSuspensionOptions();
		document.querySelectorAll('p').forEach(p => {
			const content = p.textContent;
			const highlighted = content.replace(/\d+(?:\.\d+)?/g, match => `<span class="number">${match}</span>`);
			p.innerHTML = highlighted;
		});
	});
	function calculateSuspensionOptions() {
		// Get input values
		const minFoldLength = parseFloat(document.getElementById('minFoldLength').value);
		const lengths = [
			parseFloat(document.getElementById('length1').value),
			parseFloat(document.getElementById('length2').value),
			parseFloat(document.getElementById('length3').value),
			parseFloat(document.getElementById('length4').value),
		].filter(length => !isNaN(length) && length > 0);
		// Get loop types
		const types = [
			document.getElementById('length1type').value,
			document.getElementById('length2type').value,
			document.getElementById('length3type').value,
			document.getElementById('length4type').value,
		].slice(0, lengths.length);
		// Calculate rope needed for each loop
		function calculateRopeNeeded(length, type) {
			const buryLength = parseFloat(document.getElementById('minBuryLength').value);
			if (type === 'dogbone') {
				return length + buryLength * 2;
			} else {
				// continuous loop
				return length * 2 + buryLength * 2;
			}
		}
		// Calculate rope requirements
		const ropeRequirements = lengths.map((length, index) => ({
			loopNumber: index + 1,
			loopLength: length,
			type: types[index],
			ropeNeeded: calculateRopeNeeded(length, types[index]),
		}));
		const totalRopeNeeded = ropeRequirements.reduce((sum, req) => sum + req.ropeNeeded, 0);
		// Object to store possible lengths and their combinations
		const lengthCombinations = new Map(); // key: final length, value: array of combinations
		// Calculate all possible folded lengths for a single loop
		function getFoldedLengths(originalLength) {
			const lengths = [];
			let currentLength = originalLength;
			let folds = 0;

			// Add the full length
			lengths.push({ length: currentLength, folds: folds });

			// Keep folding in half until we reach minimum fold length
			while (currentLength >= minFoldLength * 2) {
				currentLength = currentLength / 2;
				folds++;
				lengths.push({ length: currentLength, folds: folds });
			}

			return lengths;
		}

		// Generate all possible combinations of indices
		function* generateCombinations(arr, size) {
			if (size === 1) {
				for (let i = 0; i < arr.length; i++) {
					yield [arr[i]];
				}
				return;
			}

			for (let i = 0; i < arr.length; i++) {
				const first = arr[i];
				const remaining = arr.slice(i + 1);
				for (const combo of generateCombinations(remaining, size - 1)) {
					yield [first, ...combo];
				}
			}
		}

		// Calculate all possible combinations
		function calculateCombinations(lengths) {
			const loopData = lengths.map((length, index) => ({
				originalLength: length,
				loopIndex: index + 1,
				foldedOptions: getFoldedLengths(length),
			}));

			const indices = [...Array(loopData.length).keys()];

			// For each possible number of loops to combine (1 to total loops)
			for (let numLoops = 1; numLoops <= loopData.length; numLoops++) {
				// Generate all possible combinations of that many loops
				for (const indexCombo of generateCombinations(indices, numLoops)) {
					// Get all possible folding combinations for these loops
					const foldingCombos = indexCombo.map(index => loopData[index].foldedOptions);

					// Generate cartesian product of folding options
					const cartesian = (...arrays) =>
						arrays.reduce((acc, array) => acc.flatMap(x => array.map(y => [...x, y])), [[]]);

					const allFoldingCombos = cartesian(...foldingCombos);

					// Calculate sum for each folding combination
					allFoldingCombos.forEach(foldingCombo => {
						const sum = foldingCombo.reduce((acc, fold) => acc + fold.length, 0);
						const combination = foldingCombo.map((fold, i) => ({
							loopIndex: loopData[indexCombo[i]].loopIndex,
							originalLength: loopData[indexCombo[i]].originalLength,
							folds: fold.folds,
						}));
						lengthCombinations.set(sum, [...(lengthCombinations.get(sum) || []), combination]);
					});
				}
			}
		}
		// Calculate average spacing between available lengths
		function calculateAverageSpacing(sortedLengths) {
			if (sortedLengths.length < 2) return 0;

			let spacings = [];
			for (let i = 1; i < sortedLengths.length; i++) {
				spacings.push(sortedLengths[i] - sortedLengths[i - 1]);
			}

			const avgSpacing = spacings.reduce((sum, spacing) => sum + spacing, 0) / spacings.length;
			const minSpacing = Math.min(...spacings);
			const maxSpacing = Math.max(...spacings);

			return {
				average: avgSpacing,
				minimum: minSpacing,
				maximum: maxSpacing,
			};
		}

		// Format combination description
		function formatCombination(combination) {
			return combination
				.map(part => {
					const foldText = part.folds > 0 ? ` (folded ${part.folds}x)` : ' (unfolded)';
					return `Length ${part.loopIndex} (${part.originalLength}")` + foldText;
				})
				.join(' + ');
		}

		// Calculate all combinations
		calculateCombinations(lengths);

		// Sort lengths for display
		const sortedLengths = Array.from(lengthCombinations.keys()).sort((a, b) => a - b);
		const spacing = calculateAverageSpacing(sortedLengths);

		// Create display HTML
		const resultsDiv = document.getElementById('results');
		let html = '<div class="container mt-4">';

		// Summary section
		html += '<div class="card mb-4">';
		html += '<div class="card-header"><strong>Summary</strong></div>';
		html += '<div class="card-body">';
		// Length range and count
		html += `<h5 class="mb-3">Length Coverage</h5>`;
		html += `<p>Number of possible lengths: ${sortedLengths.length}</p>`;
		html += `<p>Range: ${sortedLengths[0].toFixed(1)} to ${sortedLengths[sortedLengths.length - 1].toFixed(
			1,
		)} inches (${(sortedLengths[sortedLengths.length - 1].toFixed(1) / 12).toFixed(1)} feet)</p>`;

		// Spacing analysis
		html += `<h5 class="mb-3 mt-4">Length Spacing</h5>`;
		html += `<p>Average spacing between lengths: ${spacing.average.toFixed(1)} inches</p>`;
		html += `<p>Minimum spacing: ${spacing.minimum.toFixed(1)} inches</p>`;
		html += `<p>Maximum spacing: ${spacing.maximum.toFixed(1)} inches</p>`;

		// Rope requirements
		html += `<h5 class="mb-3 mt-4">Rope Requirements</h5>`;
		html += '<div class="table-responsive"><table class="table table-sm">';
		html += '<thead><tr><th>#</th><th>Length</th><th>Type</th><th>Rope Needed</th></tr></thead>';
		html += '<tbody>';

		ropeRequirements.forEach(req => {
			html += `<tr>
      <td>Length ${req.loopNumber}</td>
      <td>${req.loopLength.toFixed(1)}"</td>
      <td>${req.type}</td>
      <td>${req.ropeNeeded.toFixed(1)}"</td>
  </tr>`;
		});

		html += `<tr class="table-active">
  <td colspan="3"><strong>Total Rope Needed</strong></td>
  <td><strong>${totalRopeNeeded.toFixed(1)} or ${(totalRopeNeeded.toFixed(1) / 12).toFixed(1)} feet</strong></td>
</tr>`;
		html += '</tbody></table></div>';

		html += '</div></div>';

		// Detailed results section
		html += '<div class="card">';
		html += '<div class="card-header"><strong>All Possible Lengths and Combinations</strong></div>';
		html += '<div class="card-body">';

		sortedLengths.forEach(length => {
			html += '<div class="mb-4">';
			html += `<h5 class="mb-2">${length.toFixed(1)}"</h5>`;
			html += '<ul class="list-unstyled ms-3">';
			lengthCombinations.get(length).forEach(combination => {
				html += `<li class="mb-1">→ ${formatCombination(combination)}</li>`;
			});
			html += '</ul></div>';
		});

		html += '</div></div></div>';

		// Display results
		resultsDiv.innerHTML = html;
	}
});
