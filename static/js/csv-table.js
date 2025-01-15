// CSV Parser implementation
const CSV = {
	parse: function (str, opts = {}) {
		const delimiter = opts.delimiter || ',';
		const rows = str.split(/\r?\n/);
		const data = [];

		// Parse a line respecting quotes
		function parseLine(line) {
			const values = [];
			let value = '';
			let insideQuotes = false;

			for (let i = 0; i < line.length; i++) {
				const char = line[i];

				if (char === '"') {
					if (insideQuotes && line[i + 1] === '"') {
						// Handle escaped quotes
						value += '"';
						i++; // Skip next quote
					} else {
						insideQuotes = !insideQuotes;
					}
				} else if (char === delimiter && !insideQuotes) {
					values.push(value.trim());
					value = '';
				} else {
					value += char;
				}
			}
			values.push(value.trim()); // Push the last value
			return values;
		}

		// Parse headers
		const headers = parseLine(rows[0]);

		// Parse data rows
		for (let i = 1; i < rows.length; i++) {
			if (!rows[i].trim()) continue; // Skip empty lines

			const values = parseLine(rows[i]);
			const row = {};

			headers.forEach((header, index) => {
				let value = values[index] || '';

				// Remove surrounding quotes if they exist
				if (value.startsWith('"') && value.endsWith('"')) {
					value = value.slice(1, -1);
				}

				// Convert to number if possible and requested
				if (opts.dynamicTyping && !isNaN(value) && value.trim() !== '') {
					value = Number(value);
				}

				row[header] = value;
			});

			data.push(row);
		}

		return {
			data: data,
			meta: { fields: headers },
		};
	},
};

// Function to initialize the table
async function initializeTable(config) {
	try {
		const response = await fetch(config.file);
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		const csvText = await response.text();
		const data = CSV.parse(csvText, { dynamicTyping: true }).data;

		// Initialize headers
		const headerRow = document.querySelector('#collectionTable thead tr');
		Object.entries(config.columns).forEach(([key, colConfig]) => {
			const th = document.createElement('th');
			th.textContent = colConfig.label;
			th.dataset.column = key;
			if (!colConfig.visible) {
				th.style.display = 'none';
			}
			headerRow.appendChild(th);
		});

		// Initialize column toggles
		const toggleContainer = document.getElementById('columnToggle');
		Object.entries(config.columns).forEach(([key, colConfig]) => {
			const label = document.createElement('label');
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = colConfig.visible;
			checkbox.dataset.column = key;
			checkbox.addEventListener('change', () => toggleColumn(key, config));
			label.appendChild(checkbox);
			label.appendChild(document.createTextNode(colConfig.label));
			toggleContainer.appendChild(label);
		});

		// Populate table
		renderTableData(data, config.columns);

		// Add sort listeners
		document.querySelectorAll('#collectionTable th').forEach(th => {
			th.addEventListener('click', () => sortTable(th.dataset.column));
		});
	} catch (error) {
		console.error('Error loading table:', error);
		document.querySelector('#collectionTable tbody').innerHTML =
			'<tr><td colspan="100%">Error loading data. Please try again later.</td></tr>';
	}
}

// Function to render table data
function renderTableData(data, columnConfig) {
	const tbody = document.querySelector('#collectionTable tbody');
	tbody.innerHTML = '';

	data.forEach(row => {
		const tr = document.createElement('tr');
		Object.entries(columnConfig).forEach(([key, config]) => {
			const td = document.createElement('td');
			td.textContent = formatCellData(row[key], key);
			if (!config.visible) {
				td.style.display = 'none';
			}
			tr.appendChild(td);
		});
		tbody.appendChild(tr);
	});
}

// Function to toggle column visibility
function toggleColumn(column, config) {
	config.columns[column].visible = !config.columns[column].visible;
	const idx = [...document.querySelectorAll('#collectionTable th')].findIndex(th => th.dataset.column === column);

	if (idx !== -1) {
		const table = document.getElementById('collectionTable');
		const cells = table.querySelectorAll(`tr > *:nth-child(${idx + 1})`);
		cells.forEach(cell => {
			cell.style.display = config.columns[column].visible ? '' : 'none';
		});
	}
}

// Function to format cell data
function formatCellData(value, column) {
	if (value === null || value === undefined || value === '') return '';

	switch (column) {
		case 'own':
		case 'wanttoplay':
			return value ? '✓' : '';
		case 'avgweight':
			return value ? Number(value).toFixed(1) : '';
		case 'rating':
			return value ? Number(value).toFixed(1) : '1.0';
		default:
			return value;
	}
}

// // Function to render table data
// function renderTableData(data, columnConfig) {
// 	const tbody = document.querySelector('#collectionTable tbody');
// 	tbody.innerHTML = '';

// 	data.forEach(row => {
// 		const tr = document.createElement('tr');
// 		Object.entries(columnConfig).forEach(([key, config]) => {
// 			if (config.visible) {
// 				const td = document.createElement('td');
// 				td.textContent = formatCellData(row[key], key);
// 				tr.appendChild(td);
// 			}
// 		});
// 		tbody.appendChild(tr);
// 	});
// }

// Function to sort table
function sortTable(column) {
	const table = document.getElementById('collectionTable');
	const th = table.querySelector(`th[data-column="${column}"]`);
	const isAsc = !th.classList.contains('sort-asc');

	// Update sort indicators
	table.querySelectorAll('th').forEach(header => {
		header.classList.remove('sort-asc', 'sort-desc');
	});
	th.classList.add(isAsc ? 'sort-asc' : 'sort-desc');

	// Get and sort rows
	const rows = Array.from(table.querySelectorAll('tbody tr'));
	const idx = [...table.querySelectorAll('th')].findIndex(header => header.dataset.column === column);

	rows.sort((a, b) => {
		const aVal = a.cells[idx].textContent;
		const bVal = b.cells[idx].textContent;

		if (aVal === bVal) return 0;
		if (aVal === '') return 1;
		if (bVal === '') return -1;

		return isAsc
			? isNaN(aVal)
				? aVal.localeCompare(bVal)
				: Number(aVal) - Number(bVal)
			: isNaN(bVal)
			? bVal.localeCompare(aVal)
			: Number(bVal) - Number(aVal);
	});

	// Reorder rows
	const tbody = table.querySelector('tbody');
	rows.forEach(row => tbody.appendChild(row));
}
