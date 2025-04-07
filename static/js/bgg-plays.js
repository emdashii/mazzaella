// Cache management
const CACHE_KEY = 'bgg_plays_data';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Main function to initialize the plays table
async function initializePlaysTable(config) {
	try {
		// Set up the table headers
		const headerRow = document.querySelector('#playsTable thead tr');
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
		const toggleContainer = document.getElementById('playsColumnToggle');
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

		// Get the plays data
		const playsData = await getPlaysData(config.username);

		// Update year filter
		populateYearFilter(playsData);

		// Set up year filter change event
		document.getElementById('yearFilter').addEventListener('change', () => {
			filterAndRenderPlays(playsData, config);
		});

		// Set up refresh button
		document.getElementById('refreshPlays').addEventListener('click', () => {
			clearCache();
			clearUI();
			initializePlaysTable(config);
		});

		// Render the table data
		filterAndRenderPlays(playsData, config);

		// Add sort listeners
		document.querySelectorAll('#playsTable th').forEach(th => {
			th.addEventListener('click', () => sortPlaysTable(th.dataset.column, playsData, config));
		});

		// Update summary stats
		updateSummaryStats(playsData);
	} catch (error) {
		console.error('Error initializing plays table:', error);
		document.querySelector('#playsTable tbody').innerHTML =
			'<tr><td colspan="100%">Error loading data. Please try again later.</td></tr>';
	}
}

// Function to filter and render plays based on the selected year
function filterAndRenderPlays(playsData, config) {
	const yearFilter = document.getElementById('yearFilter').value;

	let filteredData = playsData.games;

	if (yearFilter !== 'all') {
		filteredData = filteredData
			.map(game => {
				// Create a copy of the game with filtered plays
				const filteredGame = { ...game };
				filteredGame.plays = game.plays.filter(
					play => new Date(play.date).getFullYear().toString() === yearFilter,
				);

				// Update quantity for this year
				filteredGame.quantity = filteredGame.plays.length;

				// Update most recent play
				if (filteredGame.plays.length > 0) {
					filteredGame.mostRecentPlay = filteredGame.plays[0].date;
				} else {
					filteredGame.mostRecentPlay = '';
				}

				return filteredGame;
			})
			.filter(game => game.quantity > 0);
	}

	renderPlaysTable(filteredData, config.columns);
}

// Function to populate the year filter dropdown
function populateYearFilter(playsData) {
	const yearSelect = document.getElementById('yearFilter');

	// Clear existing options except "All"
	while (yearSelect.options.length > 1) {
		yearSelect.remove(1);
	}

	// Get unique years from plays
	const years = new Set();
	playsData.games.forEach(game => {
		game.plays.forEach(play => {
			const year = new Date(play.date).getFullYear();
			years.add(year);
		});
	});

	// Add years to dropdown in descending order
	[...years]
		.sort((a, b) => b - a)
		.forEach(year => {
			const option = document.createElement('option');
			option.value = year;
			option.textContent = year;
			yearSelect.appendChild(option);
		});

	// Default to current year if available, otherwise "all"
	const currentYear = new Date().getFullYear().toString();
	if ([...years].includes(currentYear)) {
		yearSelect.value = currentYear;
	}
}

// Function to fetch play data from BGG API with caching
async function getPlaysData(username) {
	// Check if data exists in cache and is fresh
	const cachedData = localStorage.getItem(CACHE_KEY);
	if (cachedData) {
		const parsedData = JSON.parse(cachedData);
		const isFresh = Date.now() - parsedData.timestamp < CACHE_EXPIRY;

		if (isFresh && parsedData.username === username) {
			console.log('Using cached plays data');
			return parsedData;
		}
	}

	console.log('Fetching fresh plays data from BGG API');

	// Prepare data structure
	const data = {
		username: username,
		timestamp: Date.now(),
		games: [],
		totalPlays: 0,
	};

	// Map to track unique games
	const gameMap = new Map();

	try {
		// Fetch plays data (potentially multiple pages)
		let page = 1;
		let hasMorePages = true;

		while (hasMorePages) {
			const playsXml = await fetchPlaysXml(username, page);
			const plays = parsePlayData(playsXml);

			// Process each play
			plays.forEach(play => {
				const gameId = play.gameId;

				// If this is a new game, add it to the map
				if (!gameMap.has(gameId)) {
					gameMap.set(gameId, {
						id: gameId,
						name: play.gameName,
						quantity: 0,
						plays: [],
						mostRecentPlay: '',
					});
				}

				// Update the game data
				const gameData = gameMap.get(gameId);
				gameData.quantity += play.quantity || 1;
				gameData.plays.push(play);

				// We're not tracking user plays/wins
			});

			// Check if there are more pages
			const totalCount = parseInt(playsXml.querySelector('plays').getAttribute('total'), 10);
			hasMorePages = plays.length > 0 && page * 100 < totalCount;
			page++;
		}

		// Sort plays by date (newest first) for each game
		for (const game of gameMap.values()) {
			game.plays.sort((a, b) => new Date(b.date) - new Date(a.date));
			if (game.plays.length > 0) {
				game.mostRecentPlay = game.plays[0].date;
			}
		}

		// Convert map to array and sort by play count
		data.games = Array.from(gameMap.values()).sort((a, b) => b.quantity - a.quantity);

		// Fetch additional game details (ratings, weight, etc.)
		await enrichWithGameDetails(data.games);

		// Fetch user collection data to get personal ratings
		await enrichWithUserRatings(data.games, username);

		// Calculate total plays
		data.totalPlays = data.games.reduce((sum, game) => sum + game.quantity, 0);

		// Cache the results
		localStorage.setItem(CACHE_KEY, JSON.stringify(data));

		return data;
	} catch (error) {
		console.error('Error fetching plays data:', error);
		throw new Error('Failed to fetch plays data from BGG API');
	}
}

// Function to fetch XML from the BGG API
async function fetchPlaysXml(username, page = 1) {
	const url = `https://boardgamegeek.com/xmlapi2/plays?username=${username}&subtype=boardgame&page=${page}`;

	try {
		const response = await fetch(url);

		if (!response.ok) {
			if (response.status === 202) {
				// BGG is processing the request, wait and retry
				await new Promise(resolve => setTimeout(resolve, 3000));
				return fetchPlaysXml(username, page);
			}

			throw new Error(`API request failed with status ${response.status}`);
		}

		const text = await response.text();
		const parser = new DOMParser();
		return parser.parseFromString(text, 'application/xml');
	} catch (error) {
		console.error('Error fetching XML from BGG API:', error);
		throw error;
	}
}

// Function to parse play data from XML
function parsePlayData(xml) {
	const playElements = xml.querySelectorAll('play');
	const plays = [];

	playElements.forEach(playElement => {
		const play = {
			id: playElement.getAttribute('id'),
			date: playElement.getAttribute('date'),
			quantity: parseInt(playElement.getAttribute('quantity'), 10) || 1,
			gameId: playElement.querySelector('item').getAttribute('objectid'),
			gameName: playElement.querySelector('item').getAttribute('name'),
			players: [],
		};

		// Parse players
		const playerElements = playElement.querySelectorAll('player');
		playerElements.forEach(playerElement => {
			play.players.push({
				name: playerElement.getAttribute('name'),
				userid: playerElement.getAttribute('userid'),
				win: playerElement.getAttribute('win') === '1',
				score: playerElement.getAttribute('score'),
				color: playerElement.getAttribute('color'),
			});
		});

		plays.push(play);
	});

	return plays;
}

// Function to enrich games with user's personal ratings from collection
async function enrichWithUserRatings(games, username) {
	try {
		// Fetch user's collection data
		const url = `https://boardgamegeek.com/xmlapi2/collection?username=${username}&stats=1`;
		let response = await fetch(url);

		// Handle the 202 status (BGG is processing the request)
		if (response.status === 202) {
			console.log('BGG is processing collection request, waiting...');
			await new Promise(resolve => setTimeout(resolve, 3000));
			return enrichWithUserRatings(games, username);
		}

		if (!response.ok) {
			console.error(`Failed to fetch collection data, status: ${response.status}`);
			return;
		}

		const text = await response.text();
		const parser = new DOMParser();
		const xml = parser.parseFromString(text, 'application/xml');

		// Process items in the collection
		const itemElements = xml.querySelectorAll('item');
		itemElements.forEach(itemElement => {
			const gameId = itemElement.getAttribute('objectid');
			const game = games.find(g => g.id === gameId);

			if (game) {
				// Extract user rating
				const ratingElement = itemElement.querySelector('rating');
				if (ratingElement) {
					const ratingValue = ratingElement.getAttribute('value');
					if (ratingValue !== 'N/A') {
						game.rating = parseFloat(ratingValue);
					}
				}
			}
		});

		console.log('Collection ratings loaded');
	} catch (error) {
		console.error('Error fetching collection ratings:', error);
	}
}

// Function to enrich game data with details from the BGG API
async function enrichWithGameDetails(games) {
	// Process games in batches of 20 (API limit)
	for (let i = 0; i < games.length; i += 20) {
		const batch = games.slice(i, i + 20);
		const gameIds = batch.map(game => game.id).join(',');

		try {
			const url = `https://boardgamegeek.com/xmlapi2/thing?id=${gameIds}&stats=1`;
			const response = await fetch(url);

			if (!response.ok) {
				if (response.status === 202) {
					// BGG is processing the request, wait and retry
					await new Promise(resolve => setTimeout(resolve, 3000));
					i -= 20; // Try this batch again
					continue;
				}

				console.error(`Failed to fetch game details, status: ${response.status}`);
				continue;
			}

			const text = await response.text();
			const parser = new DOMParser();
			const xml = parser.parseFromString(text, 'application/xml');

			// Process each game in the response
			const itemElements = xml.querySelectorAll('item');
			itemElements.forEach(itemElement => {
				const gameId = itemElement.getAttribute('id');
				const game = games.find(g => g.id === gameId);

				if (game) {
					// Extract year published
					const yearElement = itemElement.querySelector('yearpublished');
					if (yearElement) {
						game.yearpublished = yearElement.getAttribute('value');
					}

					// Extract min/max players
					const minplayersElement = itemElement.querySelector('minplayers');
					const maxplayersElement = itemElement.querySelector('maxplayers');
					if (minplayersElement) game.minplayers = minplayersElement.getAttribute('value');
					if (maxplayersElement) game.maxplayers = maxplayersElement.getAttribute('value');

					// Extract playing time
					const playtimeElement = itemElement.querySelector('playingtime');
					if (playtimeElement) game.playingtime = playtimeElement.getAttribute('value');

					// Extract statistics
					const statsElement = itemElement.querySelector('statistics');
					if (statsElement) {
						// Extract average rating
						const ratingElement = statsElement.querySelector('average');
						if (ratingElement) {
							game.averageRating = parseFloat(ratingElement.getAttribute('value')) || 0;
						}

						// Extract weight/complexity
						const weightElement = statsElement.querySelector('averageweight');
						if (weightElement) {
							game.avgweight = parseFloat(weightElement.getAttribute('value')) || 0;
						}

						// Extract BGG rank
						const rankElement = statsElement.querySelector('rank[type="subtype"][name="boardgame"]');
						if (rankElement && rankElement.getAttribute('value') !== 'Not Ranked') {
							game.rank = parseInt(rankElement.getAttribute('value'), 10);
						}
					}
				}
			});
		} catch (error) {
			console.error('Error enriching game details:', error);
		}
	}
}

// Function to render the plays table
function renderPlaysTable(games, columnConfig) {
	const tbody = document.querySelector('#playsTable tbody');
	tbody.innerHTML = '';

	games.forEach(game => {
		const tr = document.createElement('tr');
		Object.entries(columnConfig).forEach(([key, config]) => {
			const td = document.createElement('td');
			td.textContent = formatCellData(game[key], key);
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
	const idx = [...document.querySelectorAll('#playsTable th')].findIndex(th => th.dataset.column === column);

	if (idx !== -1) {
		const table = document.getElementById('playsTable');
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
		case 'mostRecentPlay':
			return formatDate(value);
		case 'averageRating':
		case 'rating':
			return value ? parseFloat(value).toFixed(1) : '1.0';
		case 'avgweight':
			return value ? parseFloat(value).toFixed(1) : '';
		case 'playerWins':
		case 'playerPlays':
		case 'quantity':
			return value.toString();
		default:
			return value;
	}
}

// Function to format date strings
function formatDate(dateString) {
	if (!dateString) return '';

	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

// Function to sort the plays table
function sortPlaysTable(column, playsData, config) {
	const table = document.getElementById('playsTable');
	const th = table.querySelector(`th[data-column="${column}"]`);
	const isAsc = !th.classList.contains('sort-asc');

	// Update sort indicators
	table.querySelectorAll('th').forEach(header => {
		header.classList.remove('sort-asc', 'sort-desc');
	});
	th.classList.add(isAsc ? 'sort-asc' : 'sort-desc');

	// Get the current filtered data
	const yearFilter = document.getElementById('yearFilter').value;
	let dataToSort = [...playsData.games];

	if (yearFilter !== 'all') {
		dataToSort = dataToSort
			.map(game => {
				const filteredGame = { ...game };
				filteredGame.plays = game.plays.filter(
					play => new Date(play.date).getFullYear().toString() === yearFilter,
				);
				filteredGame.quantity = filteredGame.plays.length;

				if (filteredGame.plays.length > 0) {
					filteredGame.mostRecentPlay = filteredGame.plays[0].date;
				} else {
					filteredGame.mostRecentPlay = '';
				}

				return filteredGame;
			})
			.filter(game => game.quantity > 0);
	}

	// Sort the data
	dataToSort.sort((a, b) => {
		let aVal = a[column];
		let bVal = b[column];

		// Handle specific column types
		switch (column) {
			case 'mostRecentPlay':
				aVal = aVal ? new Date(aVal) : new Date(0);
				bVal = bVal ? new Date(bVal) : new Date(0);
				break;
			case 'quantity':
			case 'rank':
			case 'yearpublished':
			case 'playingtime':
			case 'minplayers':
			case 'maxplayers':
				aVal = aVal ? parseInt(aVal, 10) : 0;
				bVal = bVal ? parseInt(bVal, 10) : 0;
				break;
			case 'averageRating':
			case 'rating':
			case 'avgweight':
				aVal = aVal ? parseFloat(aVal) : 0;
				bVal = bVal ? parseFloat(bVal) : 0;
				break;
		}

		// Compare the values
		if (aVal === bVal) return 0;
		if (aVal === '' || aVal === null || aVal === undefined) return 1;
		if (bVal === '' || bVal === null || bVal === undefined) return -1;

		return isAsc ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
	});

	// Render the sorted data
	renderPlaysTable(dataToSort, config.columns);
}

// Function to update summary statistics
function updateSummaryStats(playsData) {
	const yearFilter = document.getElementById('yearFilter').value;

	let totalPlays = 0;
	let filteredGames = [];

	if (yearFilter === 'all') {
		totalPlays = playsData.totalPlays;
		filteredGames = playsData.games;
	} else {
		filteredGames = playsData.games.filter(game => {
			const playsInYear = game.plays.filter(play => new Date(play.date).getFullYear().toString() === yearFilter);

			if (playsInYear.length > 0) {
				totalPlays += playsInYear.length;
				return true;
			}
			return false;
		});
	}

	document.getElementById('totalPlays').textContent = `Total Plays: ${totalPlays}`;
	document.getElementById('uniqueGames').textContent = `Unique Games: ${filteredGames.length}`;
	document.getElementById('lastUpdated').textContent = `Last Updated: ${formatDate(new Date(playsData.timestamp))}`;
}

// Function to clear the cache
function clearCache() {
	localStorage.removeItem(CACHE_KEY);
}

// Function to clear UI elements before rebuilding
function clearUI() {
	// Clear table headers
	const headerRow = document.querySelector('#playsTable thead tr');
	headerRow.innerHTML = '';

	// Clear table body
	const tbody = document.querySelector('#playsTable tbody');
	tbody.innerHTML = '';

	// Clear column toggles
	const toggleContainer = document.getElementById('playsColumnToggle');
	toggleContainer.innerHTML = '';

	// Reset year filter (keeping only the "All" option)
	const yearFilter = document.getElementById('yearFilter');
	while (yearFilter.options.length > 1) {
		yearFilter.remove(1);
	}

	// Reset summary stats
	document.getElementById('totalPlays').textContent = 'Total Plays: Loading...';
	document.getElementById('uniqueGames').textContent = 'Unique Games: Loading...';
	document.getElementById('lastUpdated').textContent = 'Last Updated: Refreshing...';
}
// End of file
