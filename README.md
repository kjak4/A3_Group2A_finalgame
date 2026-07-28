# Through the Trees — Group 2A 

## Game Concept and Mechanics

*Through the Trees* is a side-scrolling platformer and terrain navigation game. The player needs to reach their home located in a remote mountainside village before dark, after getting off a train deep in the forest. The player moves using **A / D**, jumps with **Space**, and must navigate through animals and forest related obstacles, as well as avoid deep holes, to reach their next terrain before the sun sets the first night. 

### Core Mechanic — Control Flip (ABI Spatial Disorientation)

At specific world positions, the left and right controls swap. Pressing D suddenly moves the player left instead of right. The flip lasts a few seconds, then snaps back. A visual and written indicator pop up as a warning just before each flip triggers, and after each flip is about to revert to the correct keys.

This mechanic represents Acquired Brain Injury (ABI) — specifically the spatial disorientation and disrupted motor-direction (usually called Alien Limb syndrome [6]) mapping that can follow a brain injury (ex. reaching with a different limb than you meant to; body is received mismatched brain signals). The disability is embedded in the control system itself: removing the flip mechanic would make the game mechanically different because the entire challenge is built around reacting to and recovering from misdirected movement. 

---

## Design Rationale

Affordances [7] are clear through use of detail. Some examples include: (ie. foreground trees cover full screen and are one colour), clear areas and signposts help indicate the suggested direction, and the sky darkens toward dusk as the player progresses, reinforcing the urgency of reaching home in a timely manner. 

Breaking down Gameflow [8] of the tutorial level:

| 0 — Open path | No obstacles. Player gets used to basic movement. |
| 1 — First direction flip (open air) | Flip triggers in a completely clear space. Player discovers the mechanic with zero punishment. |
| 2 — Obstacle weaving | A few stumps and rocks to dodge. No flips yet. |
| 3 — Flip near obstacles and wildlife | Flip fires mid-dodge. |
| 4 — Rabbit timing | Player learns to wait and time their movement. |
| 5 — Flip near wildlife | Flip fires while passing the rabbit. |
| 6 — Platforms appear | Player begins using space bar in tandem with A / D. |
| 7 — Flip on jumps | Flip fires while navigating jump-required obstacles. Hardest part as player needs to consider flip while mid air jumping, direction wise, and obstacle wise. |
| 8 — Exit | Path clears. Win. |

How ABI affects gameplay
*The flip mechanic:*
- Changes **control** — the player's learned muscle memory is suddenly wrong [6].
- Changes **decision-making** — during a flip, the player must consciously reverse their input, even mid-air.
- Affects **perception** — the mismatch between intention and outcome mirrors the disorientation ABI can cause.

Without the flip, the game is a straightforward side-scroller. With it, every section demands conscious re-evaluation of which key to press — which is the point.

---

## Setup and Interaction Instructions

To run the sketch locally, open `index.html` in Google Chrome using Live Server.
To play via GitHub Pages, visit the link pasted here:  https://kjak4.github.io/A2_Group2A_MidtermGame/ 

| Key | Action |
|-----|--------|
| A | Move left (or right when flipped) |
| D | Move right (or left when flipped) |
| Space | Jump 

Dodge the obstacles (stationary and moving!), and navigate the terrain as platforms appear. Do this without losing all 3 lives and before the sun sets to make it to the next area.

---

## Iteration Changes from Playtesting

Post-Playtest with 301 class: 
- Increased size of text on signs and loading screen, after testing showed players struggling to understand if signs were important, and what they said due to being too small.
- Thought the flashing around the border meant they had lost a life due to flashing being red, and speed of flashing, so changed flashing to yellow and after controls changed/were restored.
- Playtesters were unclear of when controls exactly would flip, and when they exactly came back, so we added a large, visible countdown. As well, we added text ti further push that they were currently just flipped, and another pop up when theyve come back.

Post-Showcase: After receiving feedback in class...
- Have the foreground and background assets feel more cohesive with the obstacle and character asstes. The character and obstacle assets have more line art and detail, so we will reflect that with the fore/background in A3.
- Instead of spikes in the ground (to show yoy shouldn't fall from the platforms), have a pit instead. As well, have the stumps you jump on be different than the stump obstacles visually so the players don't get confused.

---

## Assets

| File | Source |
|------|--------|
| `assets/sounds/music.mp3` | Taken from Pixabay - Sounds[1] |
| `assets/sounds/jump.mp3` | Taken from Pixabay - Sounds[2] |
| `assets/sounds/damage.mp3` | Taken from Pixabay - Sounds[3] |
| `assets/sounds/walking.mp3` | Taken from Pixabay - Sounds[4] |
| `assets/sounds/win.mp3` | Taken from Pixabay - Sounds[5] |

## References

[1] N2kStudio. 2023. Music for Game - Fun Kid game. Retrieved July 6, 2026 from https://pixabay.com/sound-effects/musical-music-for-game-fun-kid-game-163649/ 

[2] DRAGON-STUDIO. 2026. Cartoon Jump. Retrieved July 6, 2026 from https://pixabay.com/sound-effects/film-special-effects-cartoon-jump-463196/ 

[3] DRAGON-STUDIO. 2026. Hard Punch SFX. Retrieved July 6, 2026 from from https://pixabay.com/sound-effects/film-special-effects-hard-punch-sfx-515251/ 

[4] Kunal_Acharjee. 2024. walking sound. Retrieved July 6, 2026 from from https://pixabay.com/sound-effects/film-special-effects-walking-sound-268136/

[5] Higgs01 (Freesound). 2021. yay. Retrieved July 7, 2026 from https://pixabay.com/sound-effects/people-yay-6120/ 

[6] Noham Wolpe, Frank H. Hezemans, and James B. Rowe. 2020. Alien limb syndrome: A Bayesian account of unwanted actions. Cortex 127, (June 2020), 29–41. https://doi.org/10.1016/j.cortex.2020.02.002

[7] Rogelio E. Cardona-Rivera and R. Michael Young. 2013. A Cognitivist Theory of Affordances for Games. In Proceedings of DiGRA 2013 Conference, 2013. . https://doi.org/10.26503/dl.v2013i1.687

[8] Penelope Sweetser and Peta Wyeth. 2005. GameFlow: a model for evaluating player enjoyment in games. Comput. Entertain. 3, 3 (July 2005), 3. https://doi.org/10.1145/1077246.1077253

Note: All illustrations were made by our group members, and that is why they are not referenced/sourced.

