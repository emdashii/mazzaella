+++
title = "board games i have played"
author = ["Elliott Claus"]
date = 2025-04-07
tags = ["reference", "games"]
categories = ["notes"]
draft = false
+++

## games played {#games-played}


### summary {#summary}

<div class="plays-table-wrapper">
  <div class="plays-summary">
    <div id="totalPlays">Total Plays: Loading...</div>
    <div id="uniqueGames">Unique Games: Loading...</div>
    <div id="lastUpdated">Last Updated: Never</div>
  </div>
</div>


### details {#details}

<div class="plays-table-wrapper">
  <div class="plays-controls">
    <label for="yearFilter">Year: </label>
    <div class="select-wrapper">
      <select id="yearFilter">
        <option value="all">All</option>
      </select>
    </div>
    <button id="refreshPlays">Refresh Data</button>
  </div>
  <div class="column-toggle" id="playsColumnToggle"></div>
  <div class="collection-table-container">
    <table class="collection-table" id="playsTable">
      <thead>
        <tr></tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
</div>

<script>
const playsConfig = {
  username: "defexx",
  columns: {
    name: {
      label: "Game",
      visible: true
    },
    quantity: {
      label: "Times Played",
      visible: true
    },
    yearpublished: {
      label: "Published",
      visible: false
    },
    mostRecentPlay: {
      label: "Last Played",
      visible: true
    },
    averageRating: {
      label: "BGG Rating",
      visible: false
    },
    rating: {
      label: "My Rating",
      visible: true
    },
    avgweight: {
      label: "Complexity (1-5)",
      visible: false
    },
    playingtime: {
      label: "Playtime (min)",
      visible: false
    },
    minplayers: {
      label: "Min Players",
      visible: false
    },
    maxplayers: {
      label: "Max Players",
      visible: false
    },
    rank: {
      label: "BGG Rank",
      visible: false
    }
  }
};
</script>
<script src="../../js/bgg-plays.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  initializePlaysTable(playsConfig);
});
</script>


### notes {#notes}

data from [my play history](https://boardgamegeek.com/plays/bymonth/user/defexx/subtype/boardgame) on bgg

additional data from [board game geek](https://boardgamegeek.com/)

(additional note: ratings of 1.0 mean the game is unrated)
