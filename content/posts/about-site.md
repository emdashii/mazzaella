+++
title = "about site"
author = ["Elliott Claus"]
date = 2024-12-15
tags = ["code", "org mode", "design"]
categories = ["notes"]
draft = false
+++

## about this website {#about-this-website}

note: TODO

[mazzaella](https://github.com/emdashii/mazzaella) - code for this website. it's a [hugo](https://gohugo.io/) site, written in org-mode (with [ox-hugo](https://ox-hugo.scripter.co/)), and hosted on [netlify](https://www.netlify.com/).
the theme is [hugo-texify3](https://github.com/michaelneuper/hugo-texify3).

fun fact: after each page, if you put /index.md or /index.org at the end of the url, it will show the raw markdown/org file. like
[this](/posts/about-site/index.md) or [this]({{< relref "index" >}}).


## other TODOs {#other-todos}


### pages to create {#pages-to-create}

-   hledger intro???
-   other websites i admire/that inspired this site
    -   [yannesposito](https://yannesposito.com/index.html)
    -   [gwern](https://gwern.net/)
    -   [stephango](https://stephango.com/)
    -   [kizu](https://kizu.dev/#Everything)
    -   [joodaloop](https://joodaloop.com/)


### notes {#notes}

to export the org file to markdown, run "emacs" to start emacs, open the file, the run "C-c C-e H A" to export to md
to work on the website, start hugo with "hugo -D serve"
push to github to update the website
