// BGG Collection Updater
// This script fetches collection data from BGG and updates the loaded CSV data
// It works alongside the existing csv-table.js without modifying it

// Cache settings
const COLLECTION_CACHE_KEY = 'bgg_collection_data';
const COLLECTION_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Initialize the updater after the table is loaded
document.addEventListener('DOMContentLoaded', () => {
	// Create update controls
	createUpdateControls();

	// Check if we should update data
	setTimeout(() => {
		checkAndUpdateCollection();
	}, 500); // Small delay to ensure the CSV table is initialized first
});

// Create update button and status
function createUpdateControls() {
	const tableWrapper = document.querySelector('.collection-table-wrapper');

	// Create controls container
	const controlsContainer = document.createElement('div');
	controlsContainer.className = 'collection-controls';

	// Create status indicator
	const statusElement = document.createElement('div');
	statusElement.id = 'collectionStatus';
	statusElement.className = 'collection-status';
	const cachedData = getCachedData();
	if (cachedData) {
		const date = new Date(cachedData.timestamp);
		statusElement.textContent = `Last updated: ${date.toLocaleString()}`;
	} else {
		statusElement.textContent = 'Collection not yet updated from BGG';
	}

	// Create update button
	const updateButton = document.createElement('button');
	updateButton.id = 'updateCollection';
	updateButton.textContent = 'Update from BGG';
	updateButton.addEventListener('click', () => {
		updateCollectionFromBGG();
	});

	// Append controls
	controlsContainer.appendChild(statusElement);
	controlsContainer.appendChild(updateButton);

	// Insert after column toggle
	const columnToggle = document.querySelector('#columnToggle');
	tableWrapper.insertBefore(controlsContainer, columnToggle.nextSibling);

	// Add styles if needed (use style tag or reference plays-styles.css)
	addStyles();
}

// Fetch collection data from BGG
async function updateCollectionFromBGG() {
	const username = 'defexx'; // Your BGG username
	const statusElement = document.getElementById('collectionStatus');

	// Update status
	statusElement.textContent = 'Fetching collection from BGG...';
	statusElement.className = 'collection-status loading';

	try {
		// Fetch collection XML from BGG
		const collectionData = await fetchCollectionData(username);

		// Process and format data to match CSV structure
		const formattedData = formatCollectionData(collectionData);

		// Save to cache
		const cacheData = {
			timestamp: Date.now(),
			data: formattedData,
		};
		localStorage.setItem(COLLECTION_CACHE_KEY, JSON.stringify(cacheData));

		// Update table with new data
		updateTableWithData(formattedData);

		// Update status
		const date = new Date();
		statusElement.textContent = `Last updated: ${date.toLocaleString()}`;
		statusElement.className = 'collection-status success';
	} catch (error) {
		console.error('Error updating collection:', error);
		statusElement.textContent = `Error: ${error.message}`;
		statusElement.className = 'collection-status error';
	}
}

// Check if we should update from cache
function checkAndUpdateCollection() {
	const cachedData = getCachedData();
	if (cachedData) {
		updateTableWithData(cachedData.data);
	}
}

// Get cached data if available and not expired
function getCachedData() {
	const cachedData = localStorage.getItem(COLLECTION_CACHE_KEY);
	if (cachedData) {
		const parsedData = JSON.parse(cachedData);
		const isFresh = Date.now() - parsedData.timestamp < COLLECTION_CACHE_EXPIRY;

		if (isFresh) {
			return parsedData;
		}
	}
	return null;
}

// Fetch collection data from BGG
async function fetchCollectionData(username) {
	// Construct API URL - Include all stats, comments, and ratings
	const url = `https://boardgamegeek.com/xmlapi2/collection?username=${username}&stats=1&comments=1`;

	try {
		let response = await fetch(url);

		// Handle 202 (processing) status
		if (response.status === 202) {
			// Wait and retry
			await new Promise(resolve => setTimeout(resolve, 3000));
			return fetchCollectionData(username);
		}

		if (!response.ok) {
			throw new Error(`BGG API error: ${response.status}`);
		}

		const text = await response.text();
		const parser = new DOMParser();
		const xml = parser.parseFromString(text, 'application/xml');

		// Initial data collection from the collection API
		const items = Array.from(xml.querySelectorAll('item'));
		const collectionItems = items.map(item => {
			// Extract basic item info
			const itemData = {
				objectid: item.getAttribute('objectid'),
				objectname: item.querySelector('name')?.textContent,
				yearpublished: item.querySelector('yearpublished')?.textContent,
				comment: item.querySelector('comment')?.textContent || '',
			};

			// Extract stats
			const stats = item.querySelector('stats');
			if (stats) {
				itemData.minplayers = stats.getAttribute('minplayers') || '';
				itemData.maxplayers = stats.getAttribute('maxplayers') || '';
				itemData.playingtime = stats.getAttribute('playingtime') || '';
				itemData.numowned = stats.getAttribute('numowned') || '';

				// Extract ratings
				const ratings = stats.querySelector('rating');
				if (ratings) {
					// Get user's rating
					const userRating = ratings.getAttribute('value');
					itemData.rating = userRating && userRating !== 'N/A' ? userRating : '1.0';

					// Get average rating
					const avgElement = ratings.querySelector('average');
					if (avgElement) {
						itemData.average = avgElement.getAttribute('value') || '';
					}

					// Get weight/complexity
					const weightElement = ratings.querySelector('averageweight');
					if (weightElement) {
						itemData.avgweight = weightElement.getAttribute('value') || '';
					}

					// Get rank
					const ranks = ratings.querySelectorAll('rank');
					for (const rank of ranks) {
						if (rank.getAttribute('type') === 'subtype' && rank.getAttribute('name') === 'boardgame') {
							const rankValue = rank.getAttribute('value');
							itemData.rank = rankValue !== 'Not Ranked' ? rankValue : '';
							break;
						}
					}
				}
			}

			// Extract status info
			const status = item.querySelector('status');
			if (status) {
				itemData.own = status.getAttribute('own') === '1' ? '1' : '0';
				itemData.wanttoplay = status.getAttribute('wanttoplay') === '1' ? '1' : '0';
			}

			// Extract additional info
			itemData.numplays = item.querySelector('numplays')?.textContent || '0';

			return itemData;
		});

		// Get list of game IDs to fetch additional details
		const gameIds = collectionItems
			.filter(item => item.own === '1')
			.map(item => item.objectid)
			.join(',');

		// Fetch additional game details using the thing API
		const enrichedItems = await fetchGameDetails(gameIds, collectionItems);

		return enrichedItems;
	} catch (error) {
		console.error('Error fetching collection data:', error);
		throw new Error('Failed to fetch collection from BGG');
	}
}

// Fetch additional game details from the BGG API
async function fetchGameDetails(gameIds, collectionItems) {
	// Process in batches of 20 (API limit)
	const batchSize = 20;
	const batches = [];

	for (let i = 0; i < collectionItems.length; i += batchSize) {
		batches.push(collectionItems.slice(i, i + batchSize));
	}

	const enrichedItems = [...collectionItems];

	for (const batch of batches) {
		const batchIds = batch.map(item => item.objectid).join(',');

		try {
			const url = `https://boardgamegeek.com/xmlapi2/thing?id=${batchIds}&stats=1`;
			let response = await fetch(url);

			// Handle 202 (processing) status
			if (response.status === 202) {
				// Wait and retry
				await new Promise(resolve => setTimeout(resolve, 3000));
				return fetchGameDetails(gameIds, collectionItems);
			}

			if (!response.ok) {
				console.error(`BGG API error: ${response.status}`);
				continue;
			}

			const text = await response.text();
			const parser = new DOMParser();
			const xml = parser.parseFromString(text, 'application/xml');

			// Process each game
			const items = Array.from(xml.querySelectorAll('item'));
			items.forEach(item => {
				const gameId = item.getAttribute('id');
				const index = enrichedItems.findIndex(ci => ci.objectid === gameId);

				if (index !== -1) {
					// Let's add some debug logging to see the data structure
					console.log('Found item in collection:', gameId);

					// Update any additional fields we need
					const stats = item.querySelector('statistics');
					if (stats) {
						const ratings = stats.querySelector('ratings');
						if (ratings) {
							// Average rating
							const avgElement = ratings.querySelector('average');
							if (avgElement) {
								enrichedItems[index].average = avgElement.getAttribute('value') || '';
							}

							// Weight/complexity
							const weightElement = ratings.querySelector('averageweight');
							if (weightElement) {
								enrichedItems[index].avgweight = weightElement.getAttribute('value') || '';
							}

							// Rank
							const ranks = ratings.querySelectorAll('rank');
							for (const rank of ranks) {
								if (
									rank.getAttribute('type') === 'subtype' &&
									rank.getAttribute('name') === 'boardgame'
								) {
									const rankValue = rank.getAttribute('value');
									enrichedItems[index].rank = rankValue !== 'Not Ranked' ? rankValue : '';
									break;
								}
							}
						}
					}
					const polls = item.querySelectorAll('poll');
					polls.forEach(poll => {
						const pollName = poll.getAttribute('name');

						if (pollName === 'suggested_numplayers') {
							// Extract best player count
							const results = Array.from(poll.querySelectorAll('results'));
							let bestPlayerCount = '';
							let highestBestVotes = -1;

							results.forEach(result => {
								const numPlayers = result.getAttribute('numplayers');
								const bestVotes = parseInt(
									result.querySelector('result[value="Best"]')?.getAttribute('numvotes') || '0',
									10,
								);

								if (bestVotes > highestBestVotes) {
									highestBestVotes = bestVotes;
									bestPlayerCount = numPlayers;
								}
							});

							// Store best player count
							enrichedItems[index].bggbestplayers = bestPlayerCount;

							// Calculate recommended players
							const recommended = results
								.filter(result => {
									const bestVotes = parseInt(
										result.querySelector('result[value="Best"]')?.getAttribute('numvotes') || '0',
										10,
									);
									const recommendedVotes = parseInt(
										result.querySelector('result[value="Recommended"]')?.getAttribute('numvotes') ||
											'0',
										10,
									);
									const notRecommendedVotes = parseInt(
										result
											.querySelector('result[value="Not Recommended"]')
											?.getAttribute('numvotes') || '0',
										10,
									);
									const totalVotes = bestVotes + recommendedVotes + notRecommendedVotes;

									// Consider it recommended if at least 60% of votes are for Best or Recommended
									return totalVotes > 0 && (bestVotes + recommendedVotes) / totalVotes >= 0.6;
								})
								.map(result => result.getAttribute('numplayers'));

							enrichedItems[index].bggrecplayers = recommended.join(', ');
						}

						if (pollName === 'suggested_playerage') {
							// Get recommended age
							const results = poll.querySelector('results');
							if (results) {
								const ageVotes = Array.from(results.querySelectorAll('result')).map(res => ({
									age: res.getAttribute('value'),
									votes: parseInt(res.getAttribute('numvotes'), 10),
								}));

								// Sort by votes and get the top age
								ageVotes.sort((a, b) => b.votes - a.votes);
								if (ageVotes.length > 0) {
									enrichedItems[index].bggrecagerange = ageVotes[0].age + '+';
								}
							}
						}

						if (pollName === 'language_dependence') {
							// Get language dependence
							const results = poll.querySelector('results');
							if (results) {
								const langVotes = Array.from(results.querySelectorAll('result')).map(res => ({
									dependence: res.getAttribute('value'),
									votes: parseInt(res.getAttribute('numvotes'), 10),
								}));

								// Sort by votes and get the top language dependence
								langVotes.sort((a, b) => b.votes - a.votes);
								if (langVotes.length > 0) {
									enrichedItems[index].bgglanguagedependence = langVotes[0].dependence;
								}
							}
						}
					});
				}
			});
		} catch (error) {
			console.error('Error fetching game details:', error);
		}
	}

	return enrichedItems;
}

// Format collection data to match your CSV structure
function formatCollectionData(collectionData) {
	// Filter to only include owned games
	return collectionData.filter(item => item.own === '1');
}

// Update table with new data
function updateTableWithData(data) {
	// Debug: Check if we have the key fields
	console.log('Updating table with data:');
	if (data.length > 0) {
		const sample = data[0];
		console.log('Sample game:', sample.objectname);
		console.log('Rating:', sample.rating);
		console.log('Average:', sample.average);
		console.log('Weight:', sample.avgweight);
		console.log('Rank:', sample.rank);
	}

	// Update table with new data
	const config = config1; // Direct reference to config1

	// Re-render the table with new data
	const tbody = document.querySelector('#collectionTable tbody');
	tbody.innerHTML = '';

	// Render each row
	data.forEach(row => {
		const tr = document.createElement('tr');
		Object.entries(config.columns).forEach(([key, columnConfig]) => {
			const td = document.createElement('td');
			td.textContent = formatCellData(row[key], key);
			if (!columnConfig.visible) {
				td.style.display = 'none';
			}
			tr.appendChild(td);
		});
		tbody.appendChild(tr);
	});
}

// Add styles for the update controls
function addStyles() {
	const styleElement = document.createElement('style');
	styleElement.textContent = `
    .collection-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding: 0.5rem 0;
    }

    .collection-status {
      padding: 0.5rem 0.75rem;
      background: var(--bg1);
      border-radius: 4px;
      color: var(--fg);
    }

    .collection-status.loading {
      background-color: var(--bg_h);
    }

    .collection-status.error {
      background-color: rgba(255, 0, 0, 0.1);
      color: #d32f2f;
    }

    .collection-status.success {
      background-color: rgba(0, 255, 0, 0.05);
    }

    #updateCollection {
      background: var(--bg1);
      color: var(--fg);
      border: 2px solid var(--fg3);
      border-radius: 4px;
      padding: 0.375rem 0.75rem;
      cursor: pointer;
      font-size: 1rem;
      font-family: inherit;
      transition: background-color 0.2s, transform 0.1s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    #updateCollection:hover {
      background: var(--bg_h);
    }

    #updateCollection:active {
      transform: translateY(1px);
    }

    #updateCollection:focus {
      outline: 2px solid var(--fg3);
      outline-offset: 2px;
    }
  `;
	document.head.appendChild(styleElement);
}
