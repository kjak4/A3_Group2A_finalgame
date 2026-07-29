// ─────────────────────────────────────────────────────────
//  THROUGH THE CANYON — Level 2
//  (waterfall cliff-climb level — reuses the core mechanics
//   from Level 1: A/D move, SPACE jump, the periodic control-flip
//   with its countdown + flashing warning, and the sunrise/sunset
//   sky cycle. New this level: a set of stone platforms embedded
//   in a big waterfall cliff that you can jump up onto and climb.)
// ─────────────────────────────────────────────────────────

let imgDistant, imgCloser, imgGround, imgTrees, imgBg1;
let imgWaterfall, imgPlatforms, imgSprites;

// ── Sound variables ────────────────────────────────────────
let sndMusic, sndJump, sndDamage, sndWin, sndWalk;
let walkSoundTimer = 0;
let audioStarted    = false;

function loadSounds() {
  if (typeof loadSound === 'undefined') return;
  sndMusic  = loadSound('assets/sounds/music.mp3',   () => {}, () => { console.warn('music.mp3 failed to load');   sndMusic  = null; });
  sndJump   = loadSound('assets/sounds/jump.mp3',    () => {}, () => { console.warn('jump.mp3 failed to load');    sndJump   = null; });
  sndDamage = loadSound('assets/sounds/damage.mp3',  () => {}, () => { console.warn('damage.mp3 failed to load');  sndDamage = null; });
  sndWin    = loadSound('assets/sounds/win.mp3',     () => {}, () => { console.warn('win.mp3 failed to load');     sndWin    = null; });
  sndWalk   = loadSound('assets/sounds/walking.mp3', () => {}, () => { console.warn('walking.mp3 failed to load'); sndWalk   = null; });
}

function startAudioOnce() {
  if (!audioStarted) {
    audioStarted = true;
    if (typeof userStartAudio === 'function') userStartAudio();
  }
  if (sndMusic && sndMusic.isLoaded() && !sndMusic.isPlaying()) {
    sndMusic.setVolume(0.4);
    sndMusic.loop();
  }
}

const NUM_FRAMES = 5;
const ANIM_SPEED = 7;

let charX, charY;
let velY       = 0;
let onGround   = false;
let animFrame  = 0;
let animTimer  = 0;
let facingLeft = false;
let isMoving = false;
let sKeyHeld = false;

const GRAVITY    = 0.65;
const JUMP_FORCE = -18;
const WALK_SPEED = 4;
const CHAR_DRAW_OFFSET = -164;

let worldX      = 0;
const LEVEL_END = 9500;
let gameWon     = false;
let gameLost    = false;
let loseReason  = 'time'; // 'time' | 'fall' — controls the lose-screen message

let levelTimer      = 0;
const TIME_LIMIT    = 100 * 60;

const INTRO_DISPLAY_FRAMES = 10 * 60;
const INTRO_FADE_FRAMES = 60;
let introTimer = INTRO_DISPLAY_FRAMES + INTRO_FADE_FRAMES;
let introFadeStarted = false;

// ── control-flip mechanic (unchanged from level 1) ─────────
const FLIP_AT       = [1300, 4400, 7900];
let   flipIndex     = 0;
let   flipped       = false;
let   flipTimer     = 0;
const FLIP_DURATION = 320;
let   countdown     = 0;
const COUNTDOWN_FRAMES = 55;

// ── the big cliff / waterfall / platforms set-piece ────────
// All of these assets share one 1901x1528 "design canvas" — the
// screenshots the client sent are that canvas fully composited.
// CLIMB_WX is the world-space x where canvas-x = 0 lands, so the
// whole scene scrolls into view exactly like everything else.
const CLIMB_WX   = 6600;
const CANVAS_W   = 1901;
const CANVAS_H   = 1528;
const GROUND_TOP_CANVAS_Y = 1255; // top edge of the ground.png strip

// Makes the whole cliff/waterfall/platform formation read as a
// bigger chunk of mountain than a plain 1:1 fit of the design
// canvas would give. This is a *static* multiplier (separate from
// the dynamic camera zoom below) — tune it by eye.
const MOUNTAIN_SCALE = 1.15;

// Make the waterfall and platform sprites render larger than the
// viewport so the cliff feels massive. Tune these upward/downward
// if you want them even bigger or more restrained. Bumped up from
// 2.8 so the whole cliff/waterfall reads as much taller — combined
// with the vertical camera follow below, there's now a lot more
// climb to show as the player goes up.
const WATERFALL_DRAW_SCALE = 1.2;
const PLATFORM_DRAW_SCALE = 1.1;

// How far to shift waterfall.png upward on screen (canvas-space
// pixels, before scaling) — the image was sitting low enough that
// its top got clipped by the viewport. Increase to push it further
// up; this is applied in drawClimbScene() scaled by the current
// climbScale() so it stays in the right spot at any zoom level.
const WATERFALL_Y_SHIFT = 260;

// bounding boxes (in canvas pixels) of each of the 20 stone
// platforms baked into platforms.png, extracted directly from the
// artwork so a *cropped sprite* of each rock lines up with its
// source art. These are kept as the source/crop rects only — the
// boxes actually used for drawing position + collision are the
// "spread" copies computed below, which push each platform further
// from its neighbors while still cropping the correct rock texture
// out of the sheet. Because we're moving the platforms away from
// the notches carved into the cliff texture, they'll sit slightly
// proud of the rock face rather than flush in it — an intentional
// trade-off for the extra spacing.
const PLATFORM_SRC_BOXES = [
  [1034,830,1213,930],  [1114,1162,1293,1262], [1121,974,1299,1038],
  [1179,615,1358,715],  [1302,809,1480,873],   [1305,909,1484,1009],
  [1358,210,1537,310],  [1363,507,1541,572],   [1364,1098,1542,1163],
  [1419,1182,1598,1282],[1476,590,1655,690],   [1518,377,1697,477],
  [1519,968,1698,1068], [1520,54,1698,118],    [1574,293,1752,358],
  [1575,884,1753,949],  [1689,512,1868,612],   [1690,1103,1869,1203],
  [1700,154,1879,254],  [1701,745,1880,845],
];

// How much further apart (relative to the group's own center) each
// platform gets pushed, independently per axis. 1.0 = original
// layout, >1.0 = more spread. PLATFORM_SRC_BOXES were extracted
// straight from the source art, where the rocks already sit snug
// against the cliff/waterfall texture (see the reference
// screenshot) — spreading them HORIZONTALLY pushes them away from
// that cliff face into open air, since the cropped rock sprite
// doesn't carry the cliff notch behind it along with it, so
// SPREAD_FACTOR_X stays close to 1.0. Spreading them VERTICALLY is
// safe (and desired, for a taller climb with clearer separate
// jumps) since the tall cliff face behind them covers the whole
// climb regardless of how far up/down a given rock sits.
const SPREAD_FACTOR_X = 1.08;
const SPREAD_FACTOR_Y = 2.0;
const PLATFORM_Y_OFFSET = -90;

// ── platform visibility / fade mechanic ─────────────────────
const PLATFORM_VISIBLE_FRAMES = 4 * 60;  // fully visible for 4 seconds after entering the climb zone
const PLATFORM_FADE_FRAMES    = 30;      // then fades out over this many frames
const PLATFORM_S_MIN_OPACITY  = 0.2;     // opacity floor while holding S
const S_SPEED_MULTIPLIER      = 0.15;    // walk speed while holding S (fraction of WALK_SPEED) — "A LOT" slower
let climbZoneTimer = 0; // frames spent in the climb zone this "life" — drives the fade

function computeSpreadBoxes(boxes, factorX, factorY) {
  let cx = 0, cy = 0;
  for (let b of boxes) { cx += (b[0] + b[2]) / 2; cy += (b[1] + b[3]) / 2; }
  cx /= boxes.length; cy /= boxes.length;
  return boxes.map(b => {
    let w = b[2] - b[0], h = b[3] - b[1];
    let ctrX = (b[0] + b[2]) / 2, ctrY = (b[1] + b[3]) / 2;
    let nCtrX = cx + (ctrX - cx) * factorX;
    let nCtrY = cy + (ctrY - cy) * factorY + PLATFORM_Y_OFFSET;
    return [nCtrX - w / 2, nCtrY - h / 2, nCtrX + w / 2, nCtrY + h / 2];
  });
}

// The boxes actually used for physics + on-screen placement.
const PLATFORM_GROUND_MARGIN = 20; // canvas px of breathing room above the ground line
function clampAboveGround(boxes, srcBoxes) {
  return boxes.map((b, i) => {
    let srcH = srcBoxes[i][3] - srcBoxes[i][1];
    let halfH = (srcH * PLATFORM_DRAW_SCALE) / 2;
    let h = b[3] - b[1];
    let cy = (b[1] + b[3]) / 2;
    let maxCy = GROUND_TOP_CANVAS_Y - halfH - PLATFORM_GROUND_MARGIN;
    if (cy > maxCy) cy = maxCy;
    return [b[0], cy - h / 2, b[2], cy + h / 2];
  });
}

// The boxes actually used for physics + on-screen placement.
const PLATFORM_BOXES = clampAboveGround(
  computeSpreadBoxes(PLATFORM_SRC_BOXES, SPREAD_FACTOR_X, SPREAD_FACTOR_Y),
  PLATFORM_SRC_BOXES
);

// Precomputed per-platform center + size in canvas space. Both
// drawClimbScene() and the collision check build the on-screen box
// from these same numbers (center + PLATFORM_DRAW_SCALE), so the
// rock you can stand on is always exactly the rock that's drawn.
// Previously the drawn sprite was scaled up by PLATFORM_DRAW_SCALE
// but the collision box wasn't, so the visible rock and the
// standable area didn't line up — that's fixed here.
const PLATFORM_GEOM = PLATFORM_BOXES.map((b, i) => {
  const src = PLATFORM_SRC_BOXES[i];
  return {
    cx: (b[0] + b[2]) / 2,
    cy: (b[1] + b[3]) / 2,
    w:  src[2] - src[0],
    h:  src[3] - src[1],
    srcX: src[0], srcY: src[1],
  };
});

// ── fall-death tracking ─────────────────────────────────────
// Generous world-space bounds around the cliff/platform set-piece.
// Padded extra to account for MOUNTAIN_SCALE and the platform
// spread pushing some rocks outside the raw CANVAS_W footprint.
const CLIMB_ZONE_START = CLIMB_WX - 400;
const CLIMB_ZONE_END   = CLIMB_WX + CANVAS_W * MOUNTAIN_SCALE * SPREAD_FACTOR_X + 400;
let hasClimbed = false; // true once the player has landed on a platform this "life"

// While camera zoom is easing toward its target, every platform's
// on-screen position drifts a little EVERY frame (see updateZoom()).
// If a standing character's slow gravity-driven position can't keep
// up with that drift, the old "did we cross the surface this frame"
// collision test can miss — causing the character to silently lose
// contact with a rock it's visually standing on. To fix this we
// remember which platform (if any) the character is currently
// "riding" and, each frame, snap directly to its current position
// (like a moving platform) as long as the character is still within
// its X-range, instead of only re-detecting the crossing event.
let standingPlatformIndex = -1;

function inClimbZone(wx) { return wx >= CLIMB_ZONE_START && wx <= CLIMB_ZONE_END; }

// baseScale = the "resting" (unzoomed) canvas->screen scale, with
// MOUNTAIN_SCALE folded in. This is what groundY() is built from,
// so the character's stand height never moves due to camera zoom —
// only baseScale() feeding climbScale() moves with camZoom.
function baseScale()  { return (height / CANVAS_H) * MOUNTAIN_SCALE; }
function climbScale() { return baseScale() * camZoom; }
function groundY()    { return GROUND_TOP_CANVAS_Y * baseScale(); }
function toScreen(worldPos) { return worldPos - worldX + charX - width * 0.25; }

// climbScreenX/Y map a canvas-space coordinate to a screen-space
// coordinate, scaling about the pivot point (charX, groundY()) —
// the exact spot the character is standing on the ground. Because
// collision detection (below) calls these same two functions, the
// platforms the player collides with are always exactly where
// they're drawn, at any zoom level, with no separate transform to
// keep in sync.
function climbScreenX(cx) {
  let rawX = toScreen(CLIMB_WX) + cx * baseScale();
  return charX + (rawX - charX) * camZoom;
}
function climbScreenY(cy) {
  let rawY = cy * baseScale();
  let pivotY = groundY();
  return pivotY + (rawY - pivotY) * camZoom;
}

// ── camera zoom (mountain/cliff section) ────────────────────
// As the player approaches the climb zone the camera eases out to
// ZOOM_TARGET so more of the cliff and its platforms are visible,
// then simply stays there — zoomedOut is a one-way latch, so a
// small step backward (e.g. during a control-flip) won't zoom the
// camera back in and out again.
let camZoom      = 1;
let zoomedOut    = false;
const ZOOM_TRIGGER = CLIMB_ZONE_START - 900; // start easing out a bit before the cliff
const ZOOM_TARGET  = 0.72;                   // final "pulled back" zoom level
const ZOOM_SPEED   = 0.015;                  // easing rate per frame toward target

function updateZoom() {
  if (!zoomedOut && worldX >= ZOOM_TRIGGER) zoomedOut = true;
  let target = zoomedOut ? ZOOM_TARGET : 1;
  camZoom += (target - camZoom) * ZOOM_SPEED;
}

// ── vertical camera follow (climbing the cliff) ─────────────
// charY is the character's real "world" height (unaffected by
// this camera — physics/collision keep using it directly). camPanY
// is a purely visual offset: everything that gets drawn is shifted
// down on screen by -camPanY as the character climbs, so a much
// taller cliff can be climbed without the character walking off
// the top of the screen. camPanY is always <= 0 (it only pans
// "up the cliff", never below the resting ground view), and eases
// back toward 0 once the character comes back down near the ground.
let camPanY = 0;
const FOLLOW_SCREEN_Y = 0.45; // keep the climbing character around this fraction of screen height
const PAN_SPEED = 0.08;       // easing rate per frame toward the target pan

function updateVerticalCamera() {
  let followY = height * FOLLOW_SCREEN_Y;
  let targetPan = min(0, charY - followY);
  camPanY += (targetPan - camPanY) * PAN_SPEED;
}

// ── per-layer size tuning ────────────────────────────────────
// How much bigger than a plain "cover" fit the trees/ground layers
// are drawn, bottom-anchored so the extra size pushes their top
// edge upward — this is what makes the ground read as a big chunk
// of dirt/cliff-face instead of a thin strip. Tune these two by eye
// to match the reference screenshot.
const TREES_GROWTH  = 0.7;
const GROUND_GROWTH = 1.8;
const FARMOUNT_GROWTH = 1.0; 
const CLOSEMOUNT_GROWTH = 1.4;

// How fast each parallax layer scrolls relative to worldX. Lower =
// feels farther away (moves less per step you take), higher = feels
// closer (moves almost 1:1 with your steps) — this is what actually
// sells the depth. Ground is the "closest" layer at 1:1-ish speed;
// everything else scrolls slower the farther back it's meant to be.
// Trees share the ground's exact rate (see drawBG) since they're
// rooted in it — a different rate would make them look like they're
// sliding along the dirt instead of growing out of it.
const SCROLL_CLOUDS   = 0.04;
const SCROLL_DISTANT  = 0.10;
const SCROLL_CLOSER   = 0.28;
const SCROLL_GROUND   = 0.85;

// ── debug collision overlay ─────────────────────────────────
// Toggle at runtime with the 'P' key. Draws the exact landing line
// (red) and full sprite box (green) for every platform, using the
// SAME math as both drawClimbScene() and the collision check, so
// what you see is guaranteed to be what the game is testing against.
let DEBUG_COLLISION = false;

function drawDebugPlatformBoxes() {
  if (!DEBUG_COLLISION) return;
  let s = climbScale();
  noFill(); strokeWeight(2);
  for (let g of PLATFORM_GEOM) {
    let scx = climbScreenX(g.cx);
    let scy = climbScreenY(g.cy);
    let dw  = g.w * s * PLATFORM_DRAW_SCALE;
    let dh  = g.h * s * PLATFORM_DRAW_SCALE;
    let sx0 = scx - dw / 2;
    let sx1 = scx + dw / 2;
    let topY = (scy - dh / 2) + dh * 0.12;
    stroke(255, 0, 0);
    rect(sx0, topY, sx1 - sx0, 8);         // the actual landable surface
    stroke(0, 255, 0, 150);
    rect(sx0, scy - dh / 2, dw, dh);        // full sprite bounding box
  }
  noStroke();
}

// ─────────────────────────────────────────────────────────
function preload() {
  // Every image gets an explicit failure callback. Without one, a
  // missing/broken image file can hang p5's preload tracking and
  // block createCanvas() from ever running — leaving a permanent
  // blank/black screen with no error visible to the player. This
  // mirrors the same fix already applied to the sound loader below.
  const onImgFail = (name) => (err) => {
    console.warn(name + ' failed to load — check the path/case on your server.', err);
  };

  imgDistant   = loadImage('assets/images/distant_mountains.png', () => {}, onImgFail('distant_mountains.png'));
  imgCloser    = loadImage('assets/images/closer_mountains.png',  () => {}, onImgFail('closer_mountains.png'));
  imgGround    = loadImage('assets/images/ground.png',            () => {}, onImgFail('ground.png'));
  imgTrees     = loadImage('assets/images/lvl2trees.png',         () => {}, onImgFail('lvl2trees.png'));
  imgBg1       = loadImage('assets/images/bg1.png',                () => {}, onImgFail('bg1.png'));
  imgWaterfall = loadImage('assets/images/waterfall.png',          () => {}, onImgFail('waterfall.png'));
  imgPlatforms = loadImage('assets/images/platforms.png',          () => {}, onImgFail('platforms.png'));
  imgSprites   = loadImage('assets/images/sprites2.png',           () => {}, onImgFail('sprites2.png'));

  // Sounds are loaded in setup(), NOT here — see level 1 for why:
  // a missing/broken sound file can hang p5's preload tracking and
  // block createCanvas() from ever running, leaving a blank screen.
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CORNER);
  charX = width * 0.25;
  charY = groundY();
  loadSounds();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (onGround) charY = groundY();
}

// ─────────────────────────────────────────────────────────
function draw() {
  startAudioOnce();

  if (gameWon)  { drawWinScreen();  return; }
  if (gameLost) { drawLoseScreen(); return; }

  if (introTimer > 0) {
    introTimer--;
    drawBG(); drawChar(); drawIntroOverlay();
    return;
  }

  let dt = constrain(deltaTime / (1000 / 60), 0, 3);

   isMoving = false;
  let movingInput = keyIsDown(65) || keyIsDown(37) || keyIsDown(68) || keyIsDown(39);
  let goLeft  = flipped ? (keyIsDown(68)||keyIsDown(39)) : (keyIsDown(65)||keyIsDown(37));
  let goRight = flipped ? (keyIsDown(65)||keyIsDown(37)) : (keyIsDown(68)||keyIsDown(39));
  // Holding S reveals the (otherwise invisible) platforms a little,
  // at the cost of walking MUCH slower. Jump and left/right still
  // work normally, just at reduced speed — collision never changes,
  // only what gets drawn.

  let revealHeld = sKeyHeld;
  let currentWalkSpeed = revealHeld ? WALK_SPEED * S_SPEED_MULTIPLIER : WALK_SPEED;
  if (goLeft)  { worldX -= currentWalkSpeed * dt; if (worldX<0) worldX=0; facingLeft=true;  isMoving=true; }
  if (goRight) { worldX += currentWalkSpeed * dt; facingLeft=false; isMoving=true; }

  // Drives the platform fade below. Resets when clear of the climb
  // zone so re-entering (e.g. after a fall back to base ground)
  // shows the platforms fresh for another 4 seconds.
  if (inClimbZone(worldX)) climbZoneTimer++; else climbZoneTimer = 0;

  if ((keyIsDown(32)||keyIsDown(87)||keyIsDown(38)) && onGround) {
    velY=JUMP_FORCE; onGround=false; standingPlatformIndex=-1;
    if (sndJump && sndJump.isLoaded()) { sndJump.stop(); sndJump.setVolume(0.1); sndJump.play(); }
  }

  if (movingInput && isMoving && onGround) {
    walkSoundTimer++;
    if (walkSoundTimer >= 22) {
      walkSoundTimer = 0;
      if (sndWalk && sndWalk.isLoaded() && !sndWalk.isPlaying()) {
        sndWalk.stop(); sndWalk.setVolume(2); sndWalk.play();
      }
    }
  } else { walkSoundTimer = 0; }

  if (isMoving) {
    animTimer++;
    if (animTimer>=ANIM_SPEED) { animTimer=0; animFrame=(animFrame+1)%NUM_FRAMES; }
  } else { animFrame=0; animTimer=0; }

 let prevY = charY;
  velY  += GRAVITY * dt;
  charY += velY * dt;

  // ── camera updates moved BEFORE collision ───────────────────
  // Previously these ran after the platform-collision loop, so
  // every frame's collision math used the PREVIOUS frame's camZoom/
  // camPanY while the render used the CURRENT frame's — a one-frame
  // lag between what's drawn and what's collidable. That lag is
  // invisible at small scales but becomes a large pixel offset once
  // the waterfall/platform draw scale is big, which is why jumps
  // were whiffing. Updating zoom/pan here, before climbScale() and
  // climbScreenX/Y are used below, keeps collision and rendering
  // perfectly in sync every frame.
  updateZoom();
  updateVerticalCamera();

  let gy = groundY();

  onGround = false;

  // ── platform collision: 20 stone ledges embedded in the cliff ──
  // Built from the exact same center+size math as drawClimbScene(),
  // including PLATFORM_DRAW_SCALE, so the standable box always
  // matches the visible rock.
  let s = climbScale();

  // Pass 1: if we were already riding a platform last frame, stay
  // glued to its CURRENT position first. This is what survives
  // camera-zoom drift — rather than only checking "did we cross the
  // surface this frame," we directly recompute where that specific
  // platform is right now and snap to it, exactly like standing on a
  // moving platform. If we've walked past its edge, let go and fall.
   if (standingPlatformIndex !== -1) {
    let g = PLATFORM_GEOM[standingPlatformIndex];
    let scx = climbScreenX(g.cx);
    let scy = climbScreenY(g.cy);
    let dw  = g.w * s * PLATFORM_DRAW_SCALE;
    let dh  = g.h * s * PLATFORM_DRAW_SCALE;
    let sx0 = scx - dw / 2;
    let sx1 = scx + dw / 2;
    let topY = (scy - dh / 2) + dh * 0.12;
    let marginX = 10 * s;
    let withinX = charX > sx0 + marginX && charX < sx1 - marginX;
    // Compare the character's VISIBLE feet (charY + CHAR_DRAW_OFFSET),
    // not raw charY — otherwise the sprite renders CHAR_DRAW_OFFSET
    // pixels away from the surface it's supposedly standing on.
    let visFeet = charY + CHAR_DRAW_OFFSET;
    let nearSurface = visFeet <= topY + 8 && visFeet >= topY - 8;
    if (withinX && nearSurface && velY >= 0) {
      // Solve for the charY that puts the VISUAL feet exactly at topY.
      charY = topY - CHAR_DRAW_OFFSET; velY = 0; onGround = true;
    } else {
      standingPlatformIndex = -1; // walked off the edge or jumped away
    }
  }

  // Pass 2: not currently riding a platform (or just fell off) —
  // check for a fresh landing the normal way (falling motion crossing
  // a platform's surface this frame).
  if (!onGround) {
    for (let i = 0; i < PLATFORM_GEOM.length; i++) {
      let g = PLATFORM_GEOM[i];
      let scx = climbScreenX(g.cx);
      let scy = climbScreenY(g.cy);
      let dw  = g.w * s * PLATFORM_DRAW_SCALE;
      let dh  = g.h * s * PLATFORM_DRAW_SCALE;
      let sx0 = scx - dw / 2;
      let sx1 = scx + dw / 2;
      if (sx1 < -40 || sx0 > width+40) continue;
     let topY = (scy - dh / 2) + dh * 0.12; // small inset from the rock's top silhouette
      let marginX = 10 * s;
      let withinX = charX > sx0 + marginX && charX < sx1 - marginX;
      // Same visual-feet correction as Pass 1 — compare where the
      // sprite will actually be drawn, not the raw physics charY.
      let prevFeet = prevY + CHAR_DRAW_OFFSET;
      let currFeet = charY + CHAR_DRAW_OFFSET;
      if (withinX && prevFeet <= topY && currFeet >= topY && velY > 0) {
        charY = topY - CHAR_DRAW_OFFSET; velY = 0; onGround = true;
        standingPlatformIndex = i;
        break;
      }
    }
  }

  // landing on a platform this frame "banks" the climb — falling
  // back to the base ground afterwards (before finishing the level)
  // now counts as falling off the cliff rather than a safe landing.
  if (onGround) hasClimbed = true;
  else if (!inClimbZone(worldX)) hasClimbed = false; // clear of the cliff — reset safely

  if (!onGround && charY >= gy) {
    if (hasClimbed && inClimbZone(worldX)) {
      gameLost = true;
      loseReason = 'fall';
      standingPlatformIndex = -1;
      if (sndDamage && sndDamage.isLoaded()) { sndDamage.stop(); sndDamage.play(); }
      if (sndMusic && sndMusic.isLoaded()) sndMusic.stop();
      return;
    }
    charY = gy; velY = 0; onGround = true;
    standingPlatformIndex = -1;
  }

  updateFlip();

  if (worldX >= LEVEL_END) {
    gameWon=true;
    if (sndWin && sndWin.isLoaded()) sndWin.play();
    if (sndMusic && sndMusic.isLoaded()) sndMusic.stop();
    return;
  }
  levelTimer++;
  if (levelTimer >= TIME_LIMIT) {
    gameLost=true;
    loseReason='time';
    if (sndMusic && sndMusic.isLoaded()) sndMusic.stop();
    return;
  }

  // The vertical pan wraps EVERYTHING that scrolls with the world
  // (background, cliff/waterfall, platforms, character) but not the
  // HUD — it's a simple screen-space shift applied on top of the
  // existing horizontal/zoom transforms, so it stays independent of
  // them. Physics (charY, climbScreenY, etc.) is untouched by this;
  // only what gets drawn moves.
  push();
  translate(0, -camPanY);

  // Background & cliff shrink toward the character's fixed ground
  // point as the camera pulls back — this is what makes the cliff
  // read as a much bigger formation without the character itself
  // shrinking. The pivot is (charX, groundY()): the spot the player
  // is standing on right before the zoom starts, so nothing appears
  // to slide out from under their feet as the scale changes.
  push();
  translate(charX, groundY());
  scale(camZoom);
  translate(-charX, -groundY());
  drawBG();
  pop();
  

  // drawClimbScene() computes its own screen coordinates via
  // climbScreenX/Y, which already apply the same pivot + camZoom
  // math used above — so it lines up with drawBG() without needing
  // a second canvas transform, and stays in sync with the collision
  // code (which calls the same two functions).
   drawClimbScene(platformOpacity(revealHeld));
  drawDebugPlatformBoxes(); // no-op unless DEBUG_COLLISION is toggled on ('P')

  // drawChar() is intentionally OUTSIDE any zoom transform — the
  // character stays the same size and screen position while the
  // world around it shrinks, which sells the "the mountain is huge"
  // effect the player is walking up to. It still moves with the
  // vertical pan above, though, so it stays visible while climbing.
  drawChar();

  pop();

  drawHUD();
  drawFlipHUD();
}

// ─────────────────────────────────────────────────────────
function updateFlip() {
  if (flipped) { flipTimer--; if (flipTimer<=0) flipped=false; return; }
  if (flipIndex >= FLIP_AT.length) return;
  let trigger   = FLIP_AT[flipIndex];
  let warnStart = trigger - WALK_SPEED * COUNTDOWN_FRAMES * 3;
  if (worldX >= trigger) { flipped=true; flipTimer=FLIP_DURATION; countdown=0; flipIndex++; return; }
  if (worldX >= warnStart) {
    let elapsed = worldX - warnStart;
    let step    = WALK_SPEED * COUNTDOWN_FRAMES;
    countdown = elapsed < step ? 3 : elapsed < step*2 ? 2 : 1;
  } else { countdown=0; }
}

// ─────────────────────────────────────────────────────────
// "Cover" style scaling (like CSS background-size:cover): the scale
// is driven by whichever dimension needs it more, so every tile
// always fully spans BOTH the canvas width and height — no slivers
// of empty space at the top/bottom or between tiles, regardless of
// how the source art's aspect ratio compares to the window's.
//
// growth (default 1) lets a specific layer be sized larger than a
// plain "cover" fit — e.g. the ground/cliff-face strip, which should
// read as a much bigger chunk of the screen than a thin background
// band. When anchorBottom is true (the default), the layer's bottom
// edge stays pinned to the bottom of the canvas and the extra height
// from growth extends upward, so a bigger ground reveals more of
// itself higher up the screen instead of spilling off the bottom.
function tileLayer(img, destH, destY, scrollAmt, growth = 1, anchorBottom = false) {
  if (!img) return;
  let scale = max(width / img.width, destH / img.height) * growth;
  let tileW = img.width * scale;
  let tileH = img.height * scale;
  let yOff  = anchorBottom
    ? (destY + destH) - tileH                 // bottom edge pinned; grows upward
    : destY - (tileH - destH) / 2;            // recenter vertically (old "cover" behavior)
  let offset = ((scrollAmt*scale)%tileW+tileW)%tileW;
  let n = ceil(width/tileW)+2;
  for (let i=-1;i<n;i++) image(img,i*tileW-offset,yOff,tileW,tileH);
}

function drawBG() {
  let progress = levelTimer / TIME_LIMIT;

  // ── procedural sunrise/sunset gradient (same cycle as level 1) ──
  let skyTop, skyBot;
  if (progress < 0.35) {
    let t = progress / 0.35;
    skyTop = lerpColor(color(90,150,205), color(155,130,100), t);
    skyBot = lerpColor(color(170,195,205), color(210,175,120), t);
  } else if (progress < 0.65) {
    let t = (progress - 0.35) / 0.30;
    skyTop = lerpColor(color(155,130,100), color(155,115,115), t);
    skyBot = lerpColor(color(210,175,120), color(215,155,130), t);
  } else if (progress < 0.85) {
    let t = (progress - 0.65) / 0.20;
    skyTop = lerpColor(color(155,115,115), color(90,85,110), t);
    skyBot = lerpColor(color(215,155,130), color(135,115,130), t);
  } else {
    let t = (progress - 0.85) / 0.15;
    skyTop = lerpColor(color(90,85,110), color(30,28,42), t);
    skyBot = lerpColor(color(135,115,130), color(55,48,65), t);
  }

  noStroke();
  for (let i = 0; i <= height; i++) {
    stroke(lerpColor(skyTop, skyBot, i/height));
    line(0, i, width, i);
  }
  noStroke();

  let sunAngle = PI + progress * PI;
  let sunCx    = width*0.5 + cos(sunAngle)*width*0.38;
  let sunCy    = height*0.55 - sin(sunAngle)*height*0.55;
  let sunR     = height*0.055;
  let sunAlpha = progress < 0.8 ? 200 : map(progress, 0.8, 1.0, 200, 60);

  for (let r = sunR*2.5; r > sunR; r -= sunR*0.3) {
    let a = map(r, sunR, sunR*2.5, sunAlpha*0.5, 0);
    fill(progress < 0.5 ? color(245,220,160,a) : color(220,170,140,a));
    ellipse(sunCx, sunCy, r*2, r*2);
  }
  fill(progress < 0.5 ? color(248,228,175,sunAlpha) : progress < 0.8 ? color(235,185,130,sunAlpha) : color(180,165,195,sunAlpha));
  ellipse(sunCx, sunCy, sunR*2, sunR*2);

  // bg1.png supplies the drifting pink clouds — tinted on top of the
  // procedural gradient so the time-of-day color still reads through
  push();
  tint(255, 95);
  tileLayer(imgBg1, height, 0, worldX*SCROLL_CLOUDS);
  pop();

  // ambient parallax layers, all sharing the same 1528px design
  // canvas so their ground lines line up with the cliff set-piece.
  // Scroll rate increases the "closer" a layer is meant to be, so
  // distant peaks crawl by while the ground rushes past underfoot —
  // that speed difference is what reads as depth.
  tileLayer(imgDistant, height, -290, worldX*SCROLL_DISTANT, FARMOUNT_GROWTH);
  tileLayer(imgCloser,  height, -220, worldX*SCROLL_CLOSER,  CLOSEMOUNT_GROWTH);
  // Ground is drawn first so the trees layer renders in front of it.
  // Trees and ground are grown beyond a plain "cover" fit and
  // anchored to the bottom of the screen — reveals a much taller
  // strip of each, matching the reference screenshot proportions,
  // with the growth pushing their visible top edge further up.
  tileLayer(imgGround,  height, 0, worldX*SCROLL_GROUND, GROUND_GROWTH, true);
  // Trees use the SAME scroll rate as the ground (SCROLL_GROUND, not
  // their own) — they're rooted in it, so they need to move with it
  // in lockstep or they visually slide along the dirt instead of
  // standing still relative to it.
  tileLayer(imgTrees,   height, -210, worldX*SCROLL_GROUND, TREES_GROWTH,  true);
}

function platformOpacity(revealHeld) {
  let base;
  if (climbZoneTimer < PLATFORM_VISIBLE_FRAMES) {
    base = 1;
  } else {
    let t = (climbZoneTimer - PLATFORM_VISIBLE_FRAMES) / PLATFORM_FADE_FRAMES;
    base = constrain(1 - t, 0, 1);
  }
  return revealHeld ? max(base, PLATFORM_S_MIN_OPACITY) : base;
}

// ─────────────────────────────────────────────────────────
function drawClimbScene(opacity) {
  if (!imgWaterfall || !imgPlatforms) return; // guard against a failed load

  let s = climbScale();
  let waterfallScale = s * WATERFALL_DRAW_SCALE;
  let platformScale = s * PLATFORM_DRAW_SCALE;
  let leftSX  = climbScreenX(0);
  let rightSX = climbScreenX(CANVAS_W);
  if (rightSX < -50 || leftSX > width+50) return;

  imageMode(CORNER);
  // waterfall.png has a blank white margin on its left third — crop
  // it out so we only draw the actual cliff/waterfall artwork and
  // let the parallax scenery behind keep showing through elsewhere.
  // The extra draw scale makes it feel much larger than the screen.
  //
  // Anchored from its CENTER (not the crop's top-left corner): the
  // old top-left anchor meant the oversized image only grew
  // downward/rightward from that corner, so at large draw scales it
  // drifted out of alignment with the platforms (which are always
  // centered on their own canvas position) — the rocks could scroll
  // into view before the enlarged cliff texture caught up to the
  // same spot. Expanding symmetrically about the crop's center
  // keeps it lined up with the platforms at any WATERFALL_DRAW_SCALE.
  let cropX = 608, cropW = CANVAS_W - cropX;
  let cropCenterCanvasX = cropX + cropW / 2;
  let cropCenterCanvasY = CANVAS_H / 2;
  let waterfallCenterX = climbScreenX(cropCenterCanvasX);
  let waterfallCenterY = climbScreenY(cropCenterCanvasY) - WATERFALL_Y_SHIFT * s;
  let waterfallW = cropW * waterfallScale;
  let waterfallH = CANVAS_H * waterfallScale;
  let waterfallDX = waterfallCenterX - waterfallW / 2;
  let waterfallDY = waterfallCenterY - waterfallH / 2;
  image(imgWaterfall, waterfallDX, waterfallDY, waterfallW, waterfallH, cropX, 0, cropW, CANVAS_H);

  // Each stone ledge is drawn as its own cropped sprite, positioned
  // from the same center-based geometry (PLATFORM_GEOM) the
  // collision check uses above — so the drawn rock and the box you
  // can actually stand on are always identical in size and position.
   for (let g of PLATFORM_GEOM) {
    let scx = climbScreenX(g.cx);
    let scy = climbScreenY(g.cy);
    let dw  = g.w * platformScale;
    let dh  = g.h * platformScale;
    let dx0 = scx - dw / 2;
    let dy0 = scy - dh / 2;
    if (dx0 > width+50 || dx0+dw < -50) continue;
    image(imgPlatforms, dx0, dy0, dw, dh, g.srcX, g.srcY, g.w, g.h);
  }
  imageMode(CENTER);
}

// ─────────────────────────────────────────────────────────
function drawChar() {
  if (!imgSprites) return; // guard against a failed load

  let dispH=height*0.20, dispW=dispH*(119/135);
  let drawX=charX-dispW/2, drawY=charY-dispH + CHAR_DRAW_OFFSET;
  imageMode(CORNER);
  push();
  if (facingLeft) { translate(drawX+dispW,drawY); scale(-1,1); }
  else            { translate(drawX,drawY); }
  image(imgSprites,0,0,dispW,dispH,animFrame*119,0,119,135);
  pop();
}

// ─────────────────────────────────────────────────────────
function drawHUD() {
  let pad=width*0.018;
  let timeLeft=max(0,TIME_LIMIT-levelTimer), pct=timeLeft/TIME_LIMIT;
  let barW=width*0.18, barH=height*0.018;
  let bx=width-barW-pad, by=pad;
  noStroke(); fill(20,30,18,180); rect(bx-2,by-2,barW+4,barH+4,3);
  let bc=pct>0.5?lerpColor(color(180,210,80),color(220,180,40),map(pct,1,0.5,0,1))
        :pct>0.2?lerpColor(color(220,180,40),color(210,80,40),map(pct,0.5,0.2,0,1))
        :color(210,60,40);
  fill(bc); rect(bx,by,barW*pct,barH,2);
  stroke(20,30,18,120); strokeWeight(1);
  for (let t=1;t<6;t++) { let tx=bx+barW*(t/6); line(tx,by,tx,by+barH); }
  noStroke();
  fill(220,235,245); textFont('monospace'); textStyle(BOLD); textSize(height*0.016);
  textAlign(RIGHT,TOP); text('TIME',width-pad,by+barH+3); textStyle(NORMAL);

  let progress=levelTimer/TIME_LIMIT;
  if (progress>0.82) {
    let a=map(progress,0.82,1.0,0,200);
    fill(210,225,235,a);
    textAlign(CENTER,TOP); textFont('Georgia'); textStyle(ITALIC);
    textSize(height*0.020);
    if (floor(frameCount/25)%2===0||progress<0.92) text('the canyon light is fading...',width/2,pad);
    textStyle(NORMAL);
  }

  if (DEBUG_COLLISION) {
    fill(255,255,0); textFont('monospace'); textStyle(BOLD); textSize(height*0.016);
    textAlign(LEFT,TOP);
    text('DEBUG COLLISION ON (press P to toggle)', pad, pad);
    textStyle(NORMAL);
  }
}

// ─────────────────────────────────────────────────────────
function drawFlipHUD() {
  if (!flipped && countdown > 0) {
    noStroke(); fill(0,0,0,55); rect(0,0,width,height);
    let cx=width/2, cy=height/2;
    if (floor(frameCount/6)%2===0) { noFill(); stroke(190,220,230,140); strokeWeight(3); ellipse(cx,cy,height*0.38,height*0.38); noStroke(); }
    fill(18,28,34,180); ellipse(cx,cy,height*0.32,height*0.32);
    stroke(90,140,160,200); strokeWeight(2); noFill(); ellipse(cx,cy,height*0.32,height*0.32); noStroke();
    textAlign(CENTER,CENTER); textFont('Georgia'); textStyle(BOLD); textSize(height*0.14);
    fill(0,0,0,160); text(str(countdown),cx+3,cy+3);
    fill(200,230,235); text(str(countdown),cx,cy);
    textSize(height*0.024); textStyle(NORMAL);
    fill(0,0,0,140); text('controls changing',cx+2,cy+height*0.21+2);
    fill(180,215,220); text('controls changing',cx,cy+height*0.21);
  }

  if (flipped) {
    let cx=width/2, ty=height*0.38, msg='controls flipped';
    textFont('Georgia'); textStyle(BOLD); textSize(height*0.040);
    let tw=textWidth(msg), pw=tw+60, ph=height*0.072;
    let px=cx-pw/2, py=ty-ph/2;
    noStroke(); fill(0,0,0,100); rect(px+3,py+3,pw,ph,ph/2);
    fill(24,38,44,210); rect(px,py,pw,ph,ph/2);
    stroke(80,130,150,200); strokeWeight(2); noFill(); rect(px+3,py+3,pw-6,ph-6,ph/2); noStroke();
    fill(70,120,140,200); ellipse(px+14,ty,12,7); ellipse(px+pw-14,ty,12,7);
    textAlign(CENTER,CENTER);
    fill(0,0,0,160); text(msg,cx+2,ty+2);
    fill(200,230,235); text(msg,cx,ty);
    textStyle(NORMAL);

    let timeLeft=flipTimer;
    if (timeLeft<=180) {
      let endMsg=timeLeft<=60?'1':timeLeft<=120?'2':'3';
      let warningAlpha=timeLeft<=60?255:map(timeLeft,180,120,100,220);
      textFont('Georgia'); textStyle(BOLD); textSize(height*0.022);
      let ww=textWidth('controls returning')+40, wh=height*0.042;
      let wx2=cx-ww/2, wy=ty+ph/2+12;
      noStroke(); fill(0,0,0,80); rect(wx2+2,wy+2,ww,wh,wh/2);
      fill(28,50,80,warningAlpha); rect(wx2,wy,ww,wh,wh/2);
      stroke(140,180,210,warningAlpha); strokeWeight(1); noFill();
      rect(wx2+2,wy+2,ww-4,wh-4,wh/2); noStroke();
      textAlign(CENTER,CENTER); fill(200,220,240,warningAlpha);
      text('controls returning in '+endMsg, cx, wy+wh/2);
      if (timeLeft<=60&&floor(frameCount/6)%2===0) {
        noFill(); stroke(120,190,220,180); strokeWeight(5);
        rect(4,4,width-8,height-8); noStroke();
      }
      textStyle(NORMAL);
    }
    if (floor(frameCount/12)%2===0) { noFill(); stroke(80,140,160,80); strokeWeight(3); rect(4,4,width-8,height-8); noStroke(); }
  }
}

// ─────────────────────────────────────────────────────────
function drawIntroOverlay() {
  let alpha = introTimer <= INTRO_FADE_FRAMES
    ? constrain(map(introTimer, INTRO_FADE_FRAMES, 0, 220, 0), 0, 220)
    : 220;

  noStroke(); fill(12,18,22,alpha); rect(0,0,width,height);
  if (introTimer > INTRO_FADE_FRAMES) {
    textAlign(CENTER,CENTER); textFont('Georgia');
    fill(0,0,0,150); textStyle(NORMAL); textSize(height*0.022);
    text('Level 2',width/2+2,height/2-height*0.06+2);
    textStyle(BOLD); textSize(height*0.058);
    text('Through the Canyon',width/2+3,height/2+3);
    fill(170,205,220,255); textStyle(NORMAL); textSize(height*0.022);
    text('Level 2',width/2,height/2-height*0.06);
    textStyle(BOLD); textSize(height*0.058); fill(220,238,240,255);
    text('Through the Canyon',width/2,height/2);
    if (introTimer > INTRO_FADE_FRAMES + 20) {
      fill(150,185,195,200); textStyle(NORMAL); textSize(height*0.020);
      text('use A / D to move    SPACE to jump    climb the ledges in the waterfall',width/2,height/2+height*0.08);
    }
    textStyle(NORMAL);
  }
}

// ─────────────────────────────────────────────────────────
function drawLoseScreen() {
  drawBG();
  noStroke(); fill(8,14,18,195); rect(0,0,width,height);
  fill(20,30,36); stroke(60,95,110); strokeWeight(2);
  rectMode(CENTER); rect(width/2,height/2,min(width*0.5,560),210,10); rectMode(CORNER);
  stroke(45,80,95,140); strokeWeight(1); noFill();
  rectMode(CENTER); rect(width/2,height/2,min(width*0.5,560)-12,198,8); rectMode(CORNER);
  let cx=width/2, cy=height/2;
  noStroke(); fill(0,0,0,160);
  textAlign(CENTER,CENTER); textFont('Georgia'); textStyle(BOLD); textSize(height*0.052);
  let headline = loseReason === 'fall' ? 'lost to the falls' : 'lost to the canyon';
  let subtext  = loseReason === 'fall'
    ? 'she slipped from the rocks and the current took her.'
    : 'the light ran out before she reached the top.';
  text(headline,cx+2,cy-50+2);
  fill(180,215,225); text(headline,cx,cy-50);
  textStyle(NORMAL); textSize(height*0.022); fill(120,155,168);
  text(subtext,cx,cy+2);
  if (floor(frameCount/30)%2===0) { textSize(height*0.019); fill(150,190,200); text('press SPACE to try again',cx,cy+68); }
  textStyle(NORMAL);
}

// ─────────────────────────────────────────────────────────
function drawWinScreen() {
  drawBG();
  noStroke(); fill(225,238,242,200); rect(0,0,width,height);
  fill(248,252,253); stroke(140,175,190); strokeWeight(3);
  rectMode(CENTER); rect(width/2,height/2,min(width*0.5,580),200,12); rectMode(CORNER);
  noStroke();
  let cx=width/2,cy=height/2,cw=min(width*0.5,580)/2;
  for (let [px,py] of [[cx-cw+30,cy-75],[cx+cw-30,cy-75],[cx-cw+30,cy+75],[cx+cw-30,cy+75]]) {
    fill(160,200,220); ellipse(px,py,14,14); fill(255,240,150); ellipse(px,py,6,6);
  }
  fill(30,70,85); textAlign(CENTER,CENTER); textFont('Georgia'); textStyle(BOLD);
  textSize(height*0.055); text('She climbed above the falls!',width/2,height/2-28);
  textStyle(NORMAL); textSize(height*0.024); fill(50,95,110);
  text('The canyon opened into the light.',width/2,height/2+22);
  if (floor(frameCount/30)%2===0) { textSize(height*0.020); fill(70,120,135); text('press SPACE to play again',width/2,height/2+60); }
}

// ─────────────────────────────────────────────────────────
function keyPressed() {
  startAudioOnce();
  if (keyCode === 83) sKeyHeld = true;

  if (key === 'p' || key === 'P') { DEBUG_COLLISION = !DEBUG_COLLISION; return; }

  if (introTimer > 0 && !introFadeStarted) {
    introFadeStarted = true;
    introTimer = INTRO_FADE_FRAMES;
    return;
  }

  if (key===' ' && (gameWon||gameLost)) {
    gameWon=false; gameLost=false;
    worldX=0; flipped=false; flipTimer=0; flipIndex=0;
    introTimer=INTRO_DISPLAY_FRAMES + INTRO_FADE_FRAMES; introFadeStarted=false; countdown=0;
    levelTimer=0;
    velY=0; onGround=true;
    charX=width*0.25; charY=groundY();
    hasClimbed=false;
    standingPlatformIndex=-1;
    climbZoneTimer=0;
    camZoom=1; zoomedOut=false; camPanY=0;
    if (sndMusic && sndMusic.isLoaded()) { sndMusic.stop(); sndMusic.loop(); }
  }
}

function keyReleased() {
  if (keyCode === 83) sKeyHeld = false;
}

// Safety net: if the window/tab loses focus while S is physically held,
// the browser may never deliver the matching keyup — force-clear it here
// so movement can't stay stuck slow indefinitely.
window.addEventListener('blur', () => { sKeyHeld = false; });

function mousePressed() {
  startAudioOnce();
}


