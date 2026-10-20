+++
title = "codenames key card finder"
author = ["Elliott Claus"]
date = 2026-10-20
tags = ["code", "games", "tools", "ai"]
categories = ["projects"]
draft = false
+++

> **This post was written by AI, not by Elliott.** Claude (Opus 5.5) drafted it from the project's code and notes, and a second model (Fable 5.1) reviewed the copy. Elliott plans to rewrite it in his own words; until then, read it as a placeholder.


## what it is {#what-it-is}

[codenames.mazzaella.com](https://codenames.mazzaella.com) is a small, phone-sized site for the guessing team in Codenames. Each time a tile is revealed, you tap it in. The site works out which key card the spymaster could be holding and shows how likely each remaining tile is to be yours. After enough reveals, it shows the whole key.

Yes, this is cheating.


## why this works {#why-this-works}

The spymaster's key card says which of the 25 words belong to red, which to blue, which are neutral bystanders, and which one is the assassin that loses the game on the spot. There are over 400 billion ways to lay out 9 + 8 + 7 + 1 tiles on a 5×5 grid, but the box comes with only 40 key cards, and every box has the same 40. A card can sit in its stand four ways, so the key is always one of 160 layouts. The colored border, which everyone at the table can see, shows which team starts, which leaves 80.

Each revealed tile rules out every layout that disagrees with it. 80 layouts don't last long.


## inspiration {#inspiration}

The idea comes from Dan Luu's essay [How good can you be at Codenames without knowing any words?](https://danluu.com/codenames/) Luu describes a game where a teammate picked the last word from the shape of the board instead of the clue, and was right. The essay builds a bot that plays on position alone and lists patterns in the cards: no card has 5 in a row, only the starting team ever gets 4 in a row, and exactly one card has a connected group of six (a red one).

CodeSlate's video [How to win Codenames in one turn every time](https://www.youtube.com/watch?v=UYCgGDSUnB0) takes the next step: memorize all 40 cards, then work out from the first few revealed tiles which card is in play, so your spymaster can clue every remaining word at once. (The video's full method goes further and bends the rules; this site only does the deducing.) Here, your phone does the memorizing.


## using it {#using-it}

Set which team starts and which team you're on. Then tap each tile as it's revealed: once for red, twice for blue, three times for a bystander, four times for the assassin. Hold the phone however you like, but keep that orientation for the whole game.

{{< figure src="/images/codenames/midgame.png" alt="Key Card Finder after three reveals, with 5 layouts left" width="320" >}}

Here, after three reveals (a bystander, a red, and a blue), 5 layouts are left. The big number on each tile is the chance that it's yours. The small × number is the chance it's the assassin. The ringed tile is the suggested next guess: the tile most likely to be yours, with ties going to the tile that rules out the most layouts.

{{< figure src="/images/codenames/solved.png" alt="Key Card Finder with the key found" width="320" >}}

Five more reveals later, one layout is left. The site shows the full key and outlines your remaining agents in red.


## how fast it narrows down {#how-fast-it-narrows-down}

The repo includes a simulation that plays 100 random reveal orders for each of the 160 layouts. When tiles are revealed in random order, it takes 4.6 reveals on average to get down to one layout (median 4, worst case 13).

In a footnote, Luu says that after you make three guesses, one more guess by his bot is usually enough to narrow the key to a single board. The simulation is less rosy. Four correct reveals pin down the key in about half of games for the starting team and two thirds for the other team. Three correct reveals do it in 5% and 14%.


## getting the card data {#getting-the-card-data}

Elliott couldn't find a public dataset of the 40 cards, only random key generators. So the data came from a single photo of all 40 cards. Each card was cropped and straightened, then read twice: once by a pixel color classifier and once by eye. The two readings disagreed on 1 cell out of 1,000, where glare hid an assassin, and a closer look at the crop settled it. Every card is then checked against the game's rules (9/8/7/1 tiles, border color matches the team with 9) and against Luu's patterns.

An AI coding agent wrote most of the code from Elliott's spec. The site is static, has no backend, and works offline after the first visit. The source is on [GitHub](https://github.com/emdashii/codenames-solver). It's an unofficial fan project, not affiliated with Czech Games Edition.
