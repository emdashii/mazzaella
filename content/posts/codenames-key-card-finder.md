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

Claude Opus 5.5 wrote all of the code, working from the prompt at the bottom of this page. The site is static, has no backend, and works offline after the first visit. The source is on [GitHub](https://github.com/emdashii/codenames-solver). It's an unofficial fan project, not affiliated with Czech Games Edition.


## the prompt {#the-prompt}

This is the prompt that started the build, unedited except for two redactions (a private transcript service and a local file path). It includes the build agent's scope limits and the checks it had to report on.

```markdown
Build codenames.mazzaella.com: a mobile-first static website that helps the guessing team in Codenames (original base game, 5×5) deduce which key card the spymaster holds.

Research already done (don't redo it):
- No existing tool or public dataset does this; what exists are random key-card generators.
- Origin of the idea: Dan Luu, https://danluu.com/codenames/
- Video: CodeSlate, https://www.youtube.com/watch?v=UYCgGDSUnB0
  Transcript: [private transcript service, removed]
- Every base-game box contains the same 40 key cards. The cards are single-sided (the user confirmed the backs are blank). Each card can sit in its stand in 4 rotations, giving 160 candidate layouts.
- Each layout has 9 tiles for the starting team, 8 for the other team, 7 bystanders and 1 assassin.
- The border lights show which team starts, and that is public at the table.

Repository:
- Location: C:\Projects\codenames-solver (branch main, remote https://github.com/emdashii/codenames-solver, which is PUBLIC).
- It already has an MIT LICENSE (Elliott Claus, 2026). Keep it.
- Add this note to the README: "Code is MIT-licensed. data/keycards.json records the layouts of the key cards from Codenames (Czech Games Edition) for interoperability. It is not covered by the MIT license, and no rights to it are claimed. Codenames is a trademark of Czech Games Edition; this is an unofficial fan project."
- Use Bun for everything (install, scripts, `bun test`, build). Do not use node or npm; the user asked to "use bun over node/npm".
- Use TypeScript. Vite run through Bun is fine.
- No backend.

Naming and trademark: the user chose to "keep codenames.mazzaella.com".
- Give the tool its own title (e.g. "Key Card Finder") with the subtitle "an unofficial helper for the Codenames board game".
- Footer: "Unofficial fan tool, not affiliated with Czech Games Edition."
- Use none of CGE's logo, fonts, box art or card art. Write your own visuals.

Step 1: card data (blocking; do this first).
- Source: one photo of all 40 cards, at [local path, removed]
  Copy it to data/source/keycards.jpg.
- The repo is public, so the photo and any crops must never be committed. Add data/source/ and data/review.html to .gitignore before copying anything there.
- Card numbering, reading the photo row by row: row 1 has 4 cards on the right (cards 1–4); rows 2–7 have 6 cards each (cards 5–40).
- The photo is slightly oblique and the cards are tilted. Crop each card at full resolution before reading it.
- Cell colors: red cells have a diamond, blue cells have a circle, cream cells are bystanders, and the black ✕ is the assassin.
- Orientation in the photo doesn't matter, because the engine tries all 4 rotations.
- Transcribe each card into data/keycards.json (committed): card number, starting color (from the border lights), and a 5×5 grid of R/B/N/A.
- Transcribe every card twice, independently, and resolve every place the two readings differ by looking at the crop again.
- Validate every card:
  - exactly 9/8/7/1 counts;
  - border color = the color with 9 tiles;
  - no two cards are identical under rotation;
  - patterns from Luu's essay: no 5 in a row anywhere; any 4 in a row belongs to the starting team; exactly one card has a block of 6 adjacent tiles, and it is red-start.
- Produce data/review.html (gitignored): each crop beside a rendering of your transcription, so the user can check by eye.
- If a card fails validation or a crop is unreadable, list it and ask the user for a close-up photo. Do not guess.

Step 2: engine (pure TypeScript module, no UI).
- Expand the cards into 160 layouts and report any rotation that coincides with another.
- Input: starting team, my team, and the revealed tiles (position → color).
- Output:
  - the layouts still consistent with the input;
  - for each unrevealed tile, the probability of each color (uniform prior over the remaining layouts);
  - the tiles that are certainly mine;
  - the best next guess: highest chance of being mine, ties broken by how much it shrinks the candidate list;
  - a clear "no layout matches — check your taps" state.
- The orientation the user taps the board in doesn't matter, as long as it stays the same for the whole game.

Step 3: UI.
- One screen with a 5×5 grid. Tapping a tile cycles unrevealed → red → blue → bystander → assassin.
- Controls: starting-team and my-team toggles, undo, and new game.
- Each tile shows its chance of being mine. Certain tiles are highlighted, the best next guess is marked, and the remaining candidate count is shown.
- When one layout remains, show the full key.
- Works offline, usable one-handed on a phone, no word entry.
- Use the frontend-design skill for the visual direction.

Out of scope:
- the video's code-word + clue-number scheme for winning on turn one;
- Codenames Pictures, Duet and themed editions (leave room to add more datasets later);
- the online game.

Verification (report the results; don't just claim success):
- `bun test` covers the engine.
- Simulation over all 160 layouts with random reveal orders:
  - the true layout is never eliminated;
  - report how many reveals it takes to reach a unique match (mean, median, worst case);
  - report how many reveals it takes before all your remaining tiles are certain;
  - compare these numbers with Luu's claim that three correct reveals usually leave you one guess from winning.
- Real-app check in a phone-sized viewport:
  1. Pick a random card at a random rotation.
  2. Enter reveals.
  3. Confirm the tool identifies the card.

Hosting on Netlify: the user said "I will want to host this at codenames.mazzaella.com and use netlify to host it". Follow the pattern in C:\Projects\static-html-hosting (Netlify's Git integration building from GitHub on every push, with no tokens or Actions).
- Add netlify.toml with build command `bun run build` and the publish directory set to the build output.
- Confirm Netlify builds with Bun. If it doesn't detect Bun, pin a version and record the fix.
- Commit locally.
- The user has not authorized any of the following, so stop and ask before each one:
  - pushing to GitHub;
  - importing the repo into Netlify;
  - adding codenames.mazzaella.com under Netlify's Domain management and creating the DNS record it asks for (give the user the exact record if they need to add it themselves).
- After it goes live, run the real-app check again on https://codenames.mazzaella.com.
```
