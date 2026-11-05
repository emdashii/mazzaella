+++
title = "sinister: words you can type with one hand"
author = ["Elliott Claus"]
date = 2026-11-05
tags = ["code", "tools", "ai", "keyboard"]
categories = ["projects"]
draft = false
+++

> **This post was written by AI, not by Elliott.** Claude (Opus 5.5) drafted it from the build thread, the thread the prompt came from, the repo, and the session logs. Elliott plans to rewrite it in his own words. Until then, treat it as a record of how the project was made.


## what it is {#what-it-is}

[sinister.mazzaella.com](https://sinister.mazzaella.com) lists real English words you can type with one hand, then helps you narrow them down. Choose a hand and a layout (QWERTY, Dvorak or Colemak), or tap keys to pick your own set. Then add filters:

-   **by category** walks WordNet's tree of meanings (animal › reptile › snake). It is exact.
-   **by description** takes free text like "things in a kitchen" or "sounds scary" and ranks the remaining words by meaning. A small embedding model runs in your browser for this, so no server is involved.

Each filter is a chip that shows how many words are left after it. The whole chain is saved in the URL, so you can share a result.

Switch to the right hand and the site becomes **Dexter**, with a new name, logo, colour, favicon and copy. _Sinister_ and _dexter_ are Latin for left and right. _Sinister_ came to mean "evil" from the old superstition about the left hand. The logo is a heraldic shield whose diagonal stripe (a bend) flips with the hand. Hover over or tap the name and the site explains this.

{{< figure src="/images/sinister/sinister-phone-light.png" alt="Sinister on a phone: QWERTY left hand, filtered to animals that live in water" width="320" >}}

{{< figure src="/images/sinister/dexter-phone-light.png" alt="Dexter on a phone: QWERTY right hand, filtered to food and drink" width="320" >}}


## where the idea came from {#where-the-idea-came-from}

The idea came out of a thread about something else. Elliott had just been given a MacBook to use for travel. He asked Claude to suggest names for it (he picked **ella**). Then he asked whether Bitwarden could generate a password using only left-hand keys. It can't, so Claude gave him a one-line shell command that does. His next message turned that into a project:

> okay can you make me a little utility that I can run to generate words that only use the left handed side of the keyboard? actually this is a cool idea, maybe I can add it as a page on mazzaella.com, write up a better prompt for me to create it. basically I want words generated and I want to be able to pick categories. so like if I wanted animal words, and then filter that down to reptile names, or latin names for animals, however I want the output to only be words that can be easily typed with one hand. and as part of it you can choose the hand, and if the user has custom letters they want then they can pick the letters to use. but the cool part should be the filtering, basically I want, if possible, like an ai filtering system. so the user can pick their first filter, like type it in, and the words are reduced. then the second one, and so on. hmm maybe this should be it's own project, like at xxx.mazzaella.com. but it needs a better name. and also ideally can run in the browser without a server in the background, so I can host on netlify the way my other sites are. can you write me a prompt for this project?


## how the prompt was made {#how-the-prompt-was-made}

Elliott didn't write the build prompt himself. He described what he wanted, as above, and asked Claude to turn it into a better prompt. Claude did, suggested the name Sinister, and saved the prompt to his prompt backlog. On the way from his message to the prompt, it added:

-   **a definition of "one hand"**: the standard touch-typing split for each layout, plus a switch for whether the index finger's reach column (T G B / Y H N) counts.
-   **better source data**: Open English WordNet instead of a flat word list. WordNet already sorts words into categories, so the category filter is exact and doesn't need AI. A word-frequency list (wordfreq) puts common words first. GBIF provides the Latin names, which load only when you turn them on.
-   **a measured design choice**: a spike comparing precomputed vectors with computing them in the browser, recorded in a short design record. The spike had fixed budgets: under 1 MB before the model loads, and under 1 s per filter on a phone.
-   **checks that don't depend on anyone's judgment**:
    -   a property test showing every word uses only allowed keys;
    -   known answers that must appear (_stewardesses_ and _aftereffects_ for the left hand, _lollipop_ and _monopoly_ for the right);
    -   the AI filter's precision, scored against WordNet's own categories;
    -   an offline test.
-   **a template**: copy the stack, Netlify config and analytics tag from [key card finder](/posts/codenames-key-card-finder/).
-   **a stopping point**: build and commit, then stop and give Elliott exact steps for the parts only he can do (GitHub repo, Netlify project, DNS).

Elliott read it and added one idea of his own: right-hand mode should become Dexter, and hovering over the name should explain it. Claude added that to the prompt and launched the build in a new thread.


## the prompt {#the-prompt}

This is the prompt that started the build, unedited.

```markdown
Build a new static site, Sinister (sinister.mazzaella.com): it finds real words typable with one hand, then narrows them with chained category and free-text filters. It runs entirely in the browser, with no server, hosted on Netlify. Work in C:/Projects/sinister (an empty git repo on branch main, no remote yet) and copy the stack, netlify.toml, headers, Umami tag, and AGENTS.md finish line from C:/Projects/codenames-solver (Key Card Finder: Bun, Vite, TypeScript).

Identity: the site is Sinister in left-hand mode and Dexter in right-hand mode. Switching hands swaps everything: the name, page title, logo or wordmark, favicon, theme accent, and copy. Make the swap a short, deliberate transition, and respect prefers-reduced-motion. Hovering the name (or tapping it on touch screens; it must be keyboard focusable too) shows a short explanation: sinister and dexter are Latin for left and right. Sinister came to mean "evil" from the old superstition about the left hand, and the site is named for the hand you type with. The URL stays sinister.mazzaella.com; the hand is part of the URL state, so a shared Dexter link opens as Dexter.

Typability: a hand is a set of keys on a layout. Ship QWERTY, Dvorak, and Colemak with the standard touch-typing split (QWERTY left = qwert asdfg zxcvb). Add a toggle for whether the middle column (T G B / Y H N) counts. Custom mode lets the user tap keys on an on-screen keyboard to choose the set. The letter filter is exact and instant.

Data, built offline by committed scripts, never at runtime: start from Open English WordNet (lemmas, glosses, and hypernym chains), not a flat word list. Rank results by a frequency source (for example, wordfreq) so common words come first. For Latin names, use the Catalogue of Life or GBIF backbone, limited to a lazy-loaded subset of a few MB (state which subset and why). Record every source's license in the README and on an About page.

Filtering: each filter is a removable chip with a running count, and the whole chain is encoded in the URL so a result can be shared. Two kinds of filter:
(1) Category: browse the WordNet hypernym tree (animal > reptile > snake). It is deterministic and is the ground truth.
(2) Free-text "AI" filter (for example "things in a kitchen" or "sounds scary"): an in-browser embedding model (transformers.js in a Web Worker, loaded only when first used) ranks the current candidates by similarity to the query against their gloss and hypernym text. Show a threshold slider. Run a spike before building the UI: compare precomputed vectors (Matryoshka-truncated and binary-quantized) with embedding the post-letter-filter candidates on demand, cached in IndexedDB. Measure download size, first-filter latency, and precision, and pick one in a short ADR. Budgets: under 1 MB before the model loads, and under 1 s per filter after warm-up on a mid-range phone. If time remains, an optional "ask Claude" re-rank may use the user's own API key, stored only in their browser and off by default. The site must never need it.

Checks that don't rely on your judgment:
- A property test proves every output word uses only allowed keys, across all layouts, hands, and custom sets.
- Known records: "stewardesses" and "aftereffects" appear for QWERTY left; "lollipop" and "monopoly" appear for QWERTY right.
- For 10 category names ("reptile", "bird", "tree", "tool", "fabric", ...), the semantic filter's precision@30, scored against the WordNet descendants of that synset. Report the numbers, then tune.
- After the first load, the filters work with the network off (prove it with the devtools offline mode or a Playwright test).
- Screenshots at phone and desktop widths in light and dark mode.

Stop and give Elliott exact steps for the GitHub repo, the Netlify project, and the GoDaddy CNAME plus Netlify TXT record (copy what triage.mazzaella.com did in C:/Projects/NetworkSetup/CURRENT.md). Before then, finish per the new AGENTS.md: bun test and bun run build pass, commit. Once the repo exists, push to it and verify the Netlify deploy preview at phone width.
```


## what it cost {#what-it-cost}

Everything happened on 2026-11-05, on Claude Opus 5.5 at high effort.

| step                                  | agent time      | requests | output tokens | cache reads | cache writes | at API prices |
|---------------------------------------|-----------------|----------|---------------|-------------|--------------|---------------|
| writing the prompt (whole thread)     | ~3 min          | 24       | 15,923        | 1.73 M      | 108,217      | ~$1.50        |
| the build, plus the deploy follow-ups | 63 min + ~3 min | 149      | 176,630       | 26.69 M     | 336,833      | ~$11.50       |
| total                                 | ~70 min         | 173      | 192,553       | 28.42 M     | 445,050      | ~$13          |

-   The prompt row covers that whole thread, including the laptop names.
-   The token counts come from the Claude Code session logs, with each API response counted once.
-   The dollar figures use Opus 5.5 list prices:
    -   $20 per million output tokens;
    -   $0.20 per million cache reads;
    -   $8 per million cache writes (a one-hour cache, which costs 2× the $4 input price).
-   Uncached input was a few hundred tokens and rounds to nothing.
-   Elliott runs Claude on a subscription, so this is what the same work would cost through the API, not what he paid.

Elliott's own work was: writing the original message, adding the Dexter idea, creating the GitHub repo and the Netlify project, and adding two DNS records.


## what makes it interesting {#what-makes-it-interesting}

-   **The left hand gets the long words.** On QWERTY the left hand has 15 letters, including the three most common ones (e, t, a). The right hand has 11, and its only vowels are i, o and u (plus y). That leaves 2,393 left-hand words and only 357 right-hand ones. _stewardesses_ (12 letters) is the classic longest left-hand word. Right-hand words look like _lollipop_, _monopoly_ and _polyphony_.
-   **Categories don't need AI.** WordNet already says a cobra is a snake, a snake is a reptile, and a reptile is an animal, so "animal › reptile" is a lookup. The AI filter is only for descriptions WordNet can't answer, like "sounds scary".
-   **Measuring beat guessing.** The obvious design was to compute vectors only for the few thousand words left after the letter filter. The spike measured that at about 53 seconds on a desktop, and it would take minutes on a phone. The shipped design precomputes one vector per WordNet meaning instead: 90,450 vectors at 384 bits each, 4.2 MB in total. With those, a filter takes 36 ms once the model has loaded.
-   **Small tuning choices mattered.**
    -   Adding each meaning's parent categories to its text raised precision by about 0.15.
    -   Storing 1 bit per dimension instead of a float cost nothing measurable.
    -   Cutting below 256 dimensions hurt badly.
    -   The model's own recommended query prompt made short queries much worse (0.25 instead of 0.71).
-   **It is still approximate.** Across the 10 test categories, the AI filter's top 30 words were 71% correct on average: 100% for birds, but 40% for fish. On the live site, "things in a kitchen" returned _dresser_ and _garbage_ first, and the Dexter screenshot above shows _kill_ under "food and drink". For an exact answer, use the category filter.
-   **It's all static.** Until you use the AI filter, a visit downloads about 570 KB, mostly the word list. The first description filter downloads about 31 MB (model, runtime and vectors). After that it works offline.


## what went sideways {#what-went-sideways}

-   `sinister.netlify.app` already belonged to someone else's site, also called Sinister. The Netlify project is `sinister-dexter`.
-   Vite bundled a 27 MB WebAssembly file the app never loads. The build removes it.
-   Chrome's CPU throttling doesn't reach the Web Worker that runs the model. So the "about 0.2 s on a mid-range phone" figure is an estimate, and nobody has tested it on a real phone yet.
-   The optional "ask Claude" re-rank wasn't built.


## links {#links}

-   [sinister.mazzaella.com](https://sinister.mazzaella.com) (or [dexter](https://sinister.mazzaella.com/?hand=right))
-   [source on GitHub](https://github.com/emdashii/sinister). The README lists the data sources and their licenses, and `docs/adr/0001-semantic-filter.md` has the full spike results.
