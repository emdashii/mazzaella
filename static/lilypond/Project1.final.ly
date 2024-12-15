\header {
title = "Ubi Caritas"
composer = "Elliott Claus"
tagline = "Text from http://www.catholicchant.com/ubicaritas.html"
}

\paper {
  system-system-spacing #'basic-distance = #16
}
global = { \key c \major \time 4/4 \tempo 4. = 100 }


% Phrase one. Imitative counterpoint a 5th above. C major.
topPhraseOne = \relative c'' { \clef "treble" \key c \major \time 4/4
r2 g4 a | b2 d~ | d4 c b2 | a( c4 ) d | e2~ e4 d | c2( g4 a ) | b1 | c \bar "||" }
bottomPhraseOne = \relative c' { \clef "treble" \key c \major \time 4/4
c4 d e2 | g f | e d | f4( g a2 ) | g( f ) | e4( d ) e2 | g4( f e d ) | c1 }


% Phrase two. Imitative counterpoint a 5th below.
topPhraseTwo = \relative c'' { 
c2 d | e4( d c2 ) | c4( b a2 ) | b4( c8 d e2 ) | f4 g~ g8( f e d ) | c2 d4( e | d2 ) e | c( b ) | c1 \bar "||" }
bottomPhraseTwo = \relative c' { 
r2 f2 | g a4( g | f2 ) f4( e | d4 e8 f ) e4( f8 g | a2 ) b | c f, | g4( f ) g2 | a( d, ) | c1 }


% Phrase three. Imitative counterpoint a 5th above, until 4th species. C major.
topPhraseThree = \relative c'' { 
r2 g2 | b~ b4 a | c2~( c4 b ) | d2 f~ | f4 e~ e d~ | d c~ c b~ | b a~( a g ) | a4( b c2 ) \bar "||" }
bottomPhraseThree = \relative c' { 
c4( d e2 ) | d4( e f2 ) | e4( f g2 ) | b4( c d2 ) | c b | a g | f e | d c }


% Phrase four. Imitative counterpoint a 5th above. Gish major. Resolves to C
topPhraseFour = \relative c'' { 
r2 g2( | b4 c d2 ) | c d | a c8( b c d ) | e2 g | fis( e4 ) d~ | d4 c b2 | c1  \bar "||" }
bottomPhraseFour = \relative c' { 
c4( d e2 | g ) fis~ | fis4 e d2 | fis8( e fis g ) a2 | c8( b c d ) b2 | a g | e2( d ) | c1 | }


% Phrase five. Phrase one a second time.
topPhraseFive = \relative c'' { 
r2 g4 a | b2 d~( | d4 c ) b2 | a( c4 ) d | e2~ e4 d | c2( g4 a ) | b1 | c \bar "||" }
bottomPhraseFive = \relative c' { 
c4( d ) e2 | g f | e d | f4( g a2 ) | g( f ) | e4( d ) e2 | g4( f e d ) | c1 }


phraseOne = \lyricmode { 
U -- bi ca -- ri -- tas et a -- mor, De -- us i -- bi est. 
Con -- gre -- ga -- vit nos in un -- um Chri -- sti a -- mor. 
E -- xult -- e -- mus, __ et in i -- pso ju -- cu -- nde -- mur.
Ti -- me -- a -- mus, et a -- me -- mus De -- um vi -- vum.
Et ex cor -- de di -- li -- ga -- mus nos sin -- ce -- ro. 
}


\score{
  <<
    <<
    
      \new Voice = "one" {
        \global
        \topPhraseOne
        \topPhraseTwo
        \topPhraseThree
        \topPhraseFour
        \topPhraseFive 
      }
      {
        \new Lyrics \lyricsto "one" \phraseOne
      }
      >>
      \new Voice = "two" { 
        \global
        \bottomPhraseOne
        \bottomPhraseTwo
        \bottomPhraseThree
        \bottomPhraseFour
        \bottomPhraseFive 
      }
      {
        \new Lyrics \lyricsto "two" \phraseOne
      }
  >>
	\layout{}
	\midi{}
}