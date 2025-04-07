+++
title = "board games i own"
author = ["Elliott Claus"]
date = 2025-01-15
tags = ["reference", "games"]
categories = ["notes"]
draft = false
+++

## board games {#board-games}


### collection table {#collection-table}

<div class="collection-table-wrapper">
  <div class="column-toggle" id="columnToggle"></div>
  <div class="collection-table-container">
    <table class="collection-table" id="collectionTable">
      <thead>
        <tr></tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
</div>

<script>
const config1 = {
  file: "/csv/collection.csv",
  columns: {
    objectname: {
      label: "game",
      visible: true
    },
    yearpublished: {
      label: "published",
      visible: false
    },
    comment: {
      label: "description",
      visible: true
    },
    numplays: {
        label: "times played",
        visible: false
        },
    rating: {
      label: "my rating (1-10)",
      visible: true
    },
    average: {
      label: "average bgg rating (1-10)",
      visible: false
    },
    avgweight: {
      label: "complexity (1-5)",
      visible: false
    },
    playingtime: {
      label: "playtime (min)",
      visible: false
    },
    bggbestplayers: {
      label: "best plays",
      visible: false
    },
    bggrecplayers: {
        label: "recommended players",
        visible: false
        },
    minplayers: {
        label: "min players",
        visible: false
        },
    maxplayers: {
        label: "max players",
        visible: false
        },
    bggrecagerange: {
      label: "recommended age range",
      visible: false
    },
    rank: {
      label: "bgg rank",
      visible: false
    },
    numowned: {
        label: "number of copies owned",
        visible: false
        },
    bgglanguagedependence: {
     label: "reading required",
     visible: false
    }
  }
};
</script>
<script src="../../js/csv-table.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  initializeTable(config1);
});
</script>
<script src="../../js/bgg-collection-updater.js"></script>

(additional note: ratings of 1.0 mean the game is unrated)


### links {#links}

data from [my game collection](https://boardgamegeek.com/collection/user/defexx) on bgg

additional data from [board game geek](https://boardgamegeek.com/)
