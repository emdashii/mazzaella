+++
title = "board game wishlist"
author = ["Elliott Claus"]
date = 2025-01-15
tags = ["reference", "board games"]
categories = ["notes"]
draft = false
+++

## wishlist {#wishlist}

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
const config2 = {
  file: "/csv/bgwishlist.csv",
  columns: {
    objectname: {
      label: "game",
      visible: true
    },
    yearpublished: {
      label: "published",
      visible: true
    },
    average: {
      label: "average bgg rating (1-10)",
      visible: true
    },
    avgweight: {
      label: "complexity (1-5)",
      visible: true
    },
    playingtime: {
      label: "playtime (min)",
      visible: true
    },
    bggbestplayers: {
      label: "recommended players",
      visible: true
    },
    bggrecagerange: {
      label: "recommended age range",
      visible: true
    },
    bgglanguagedependence: {
      label: "language dependency",
      visible: false
    },
    rank: {
      label: "bgg rank",
      visible: false
    }
  }
};
</script>
<script src="../../js/csv-table.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  initializeTable(config2);
});
</script>

data from [my game collection](https://boardgamegeek.com/collection/user/defexx) on bgg

additional data from [board game geek](https://boardgamegeek.com/)
