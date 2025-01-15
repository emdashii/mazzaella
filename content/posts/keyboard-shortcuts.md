+++
title = "keyboard shortcuts – a non-exhaustive list"
author = ["Elliott Claus"]
date = 2022-06-13
tags = ["keyboard", "shortcuts", "reference"]
categories = ["notes"]
draft = false
+++

<style>
.shortcuts-table table {
    width: 100%;
}
.shortcuts-table th,
.shortcuts-table td {
    padding: 0.75rem;
}
.shortcuts-table tbody tr:nth-of-type(odd) {
    background-color: rgba(0, 0, 0, 0.05);
}
.shortcuts-table tbody tr:hover {
    background-color: rgba(0, 0, 0, 0.075);
}
</style>


## Visual Studio/VS Code {#visual-studio-vs-code}

<div class="ox-hugo-table shortcuts-table">

| Keys                      | Effect                              |
|---------------------------|-------------------------------------|
| `ctrl+w`                  | select word                         |
| `ctrl+l`                  | select line                         |
| `Home / End`              | go to the beginning/end of the line |
| `alt+up/down arrow`       | move line up/down                   |
| `shift+alt+up/down arrow` | copy line up/down                   |
| `ctrl+delete/backspace`   | deletes word before/after           |
| `ctrl+k`                  | comment                             |
| `ctrl+shift+z or ctrl+y`  | redo                                |
| `ctrl+f`                  | find                                |
| `F3`                      | find next                           |
| `ctrl+h`                  | find and replace                    |
| `ctrl+enter`              | enter above                         |
| `ctrl+tab`                | change working document             |
| `F12`                     | go to definition                    |
| `shift+alt+f`             | format document                     |
| `ctrl+shift+space`        | trigger parameter hints             |

</div>


## Web Browser {#web-browser}

<div class="ox-hugo-table shortcuts-table">

| Keys                  | Effect                                      |
|-----------------------|---------------------------------------------|
| `ctrl+tab`            | change tab forwards                         |
| `ctrl+shift+tab`      | change tab backwards                        |
| `middle click a link` | opens in a new tab                          |
| `middle click a tab`  | closes the tab                              |
| `ctrl+number`         | jumps to that open tab                      |
| `ctrl+t`              | opens new tab                               |
| `ctrl+w`              | closes open tab                             |
| `alt+arrow key`       | forwards or backwards                       |
| `ctrl+(+) or (-)`     | zooms in or out                             |
| `ctrl+0`              | resets to default zoom                      |
| `alt+d`               | selects url                                 |
| `ctrl+f`              | search webpage                              |
| `alt+e`               | opens hamburger                             |
| `F5`                  | refresh                                     |
| `ctrl+F5`             | refreshes page and redownloads cached files |
| `ctrl+shift+t`        | restores closed tabs                        |

</div>


## Editing Text {#editing-text}

<div class="ox-hugo-table shortcuts-table">

| Keys                   | Effect                                             |
|------------------------|----------------------------------------------------|
| `gui+v`                | shows clipboard history (enable in settings first) |
| `ctrl+shift+v`         | pastes as plaintext                                |
| `ctrl+arrowkeys`       | jumps cursor through words                         |
| `shift+arrowkeys`      | selects characters                                 |
| `ctrl+shift+arrowkeys` | selects whole word                                 |
| `alt+F4`               | closes active window                               |
| `gui+;`                | opens emoji menu                                   |
| `shift+F10`            | opens spellcheck selection (right clicks)          |

</div>


## turn clipboard history on! {#turn-clipboard-history-on}

change this setting if you are using windows. it makes life so much better.

{{< figure src="/images/wincopy.png" >}}


## [organice](https://organice.200ok.ch/) shortcuts {#organice-shortcuts}

my current notes app

<div class="ox-hugo-table shortcuts-table">

| Keys           | Effect                 |
|----------------|------------------------|
| `^down arrow`  | select next header     |
| `^up arrow`    | select previous header |
| `tab`          | toggle header opened   |
| `C-t`          | advance todo state     |
| `^-h`          | edit title             |
| `^-d`          | edit description       |
| `C-enter`      | exit edit mode         |
| `^-enter`      | add header             |
| `backspace`    | remove header          |
| `C-up arrow`   | move header up         |
| `C-down arrow` | move header down       |
| `C-up-left`    | move header left       |
| `C-up-right`   | move header right      |
| `^-/`          | undo                   |

</div>


## doom emacs {#doom-emacs}

<div class="ox-hugo-table shortcuts-table">

| Keys           | Effect                 |
|----------------|------------------------|
| `C-c C-a`      | save a file            |
| `SPC f s`      | save a file            |
| `C-c C-e H A`  | export to md           |
| `SPC b k`      | exit a file            |
| `SPC g g`      | open git               |
| `q`            | close buffer or window |
| `S`            | stage all changes      |
| `c c`          | create a commit        |
| `C-c C-c`      | finalize the commit    |
| `p p`          | push to default remote |
| `SPC p a`      | add a project          |
| `SPC p p`      | open a project         |
| `SPC .`        | find and open a file   |
| `SPC s s`      | search current buffer  |
| `SPC w`        | window management      |
| `SPC h`        | help                   |
| `SPC u`        | visual undo history    |
| `ctrl+shift+-` | undo                   |
| `alt+shift+-`  | redo                   |
| `C-g`          | swich undo direction   |
| `C-/`          | undo                   |

</div>
