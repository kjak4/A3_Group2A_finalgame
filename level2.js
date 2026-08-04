// ─────────────────────────────────────────────────────────
//  THROUGH THE CANYON — Level 2
//  (waterfall cliff-climb level — reuses the core mechanics
//   from Level 1: A/D move, SPACE jump, the periodic control-flip
//   with its countdown + flashing warning, and the sunrise/sunset
//   sky cycle. New this level: a set of stone platforms embedded
//   in a big waterfall cliff that you can jump up onto and climb.)
//
//  UPDATED: brings back Level 1's 3-heart HP system and its
//  ground obstacles (logs, rocks, rabbit/racoon). Hitting an
//  obstacle costs one heart, exactly like Level 1. Falling off
//  the waterfall platforms after you've climbed still kills you
//  immediately and restarts the level (unchanged) — but it now
//  also zeroes out all 3 hearts on the way down, since a fall
//  from that height is meant to cost you everything at once.
// ─────────────────────────────────────────────────────────


let imgDistant, imgCloser, imgGround, imgTrees, imgBg1;
let imgWaterfall, imgPlatforms, imgSprites;
let imgLog, imgRock, imgRacoon, imgRabbit;
let imgCliffTop; // "the other side of the waterfall" — cliff continuation art with the wooden door


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


// ── HP / hearts (reused from Level 1) ───────────────────────
let hp           = 3;
const MAX_HP     = 3;
let invTimer     = 0;
const INV_FRAMES = 80;


const GRAVITY    = 0.65;
const JUMP_FORCE = -18;
const WALK_SPEED = 4;
const CHAR_DRAW_OFFSET = -164;


let worldX      = 0;
const LEVEL_END = 9500;
let gameWon     = false;
let gameLost    = false;
let loseReason  = 'time'; // 'time' | 'fall' | 'hurt' — controls the lose-screen message


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


// ── ground obstacles (reused from Level 1) ──────────────────
// Placed along the canyon floor before the waterfall cliff set-piece
// begins (CLIMB_ZONE_START is ~6200), so they never overlap the
// climb — those two hazard types stay independent of each other.
const LOGS  = [{ wx:900 }, { wx:2700 }, { wx:5100 }];
const ROCKS = [{ wx:1450 }, { wx:3400 }, { wx:4600 }];


let animals = [
 { wx:2200, type:'rabbit', dir: 1, range:110, speed:2.0, frame:0, ft:0 },
 { wx:3900, type:'racoon', dir: 1, range: 90, speed:1.5, frame:0, ft:0 },
 { wx:5400, type:'rabbit', dir: 1, range:100, speed:1.8, frame:0, ft:0 },
];
animals.forEach(a => a.startWx = a.wx);


// ── the big cliff / waterfall / platforms set-piece ────────
// All of these assets share one 1901x1528 "design canvas" — the
// screenshots the client sent are that canvas fully composited.
// CLIMB_WX is the world-space x where canvas-x = 0 lands, so the
// whole scene scrolls into view exactly like everything else.
const CLIMB_WX   = 6100;
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
const WATERFALL_DRAW_SCALE = 1.8;
const PLATFORM_DRAW_SCALE = 1.2;
const TOP_DRAW_SCALE = WATERFALL_DRAW_SCALE; // match left waterfall's enlargement

// How far to shift waterfall.png upward on screen (canvas-space
// pixels, before scaling) — the image was sitting low enough that
// its top got clipped by the viewport. Increase to push it further
// up; this is applied in drawClimbScene() scaled by the current
// climbScale() so it stays in the right spot at any zoom level.
const WATERFALL_Y_SHIFT = 120;


// ── the far side of the waterfall: continuation cliff + door ────
// waterfall_top.png is a SEPARATE piece of art (3000x2200, per the
// export metadata) rather than being folded into the 1901x1528
// canvas above — different source image, different resolution, so
// it gets its own "design canvas" using the exact same pattern as
// CANVAS_W/CANVAS_H/CLIMB_WX.
const TOP_CANVAS_W = 3000;
const TOP_CANVAS_H = 2200;


// World-space x where TOP canvas-x = 0 lands. Defaults to sitting
// immediately after the first canvas's own footprint (CLIMB_WX +
// CANVAS_W) so the two pieces of rock face are edge-to-edge with no
// gap — nudge TOP_X_ALIGN_OFFSET/TOP_Y_ALIGN_OFFSET below once both
// assets are visible together in-game and the rock texture needs a
// pixel-level seam match (same idea as WATERFALL_Y_SHIFT above).
// How much to pull waterfall_top.png's anchor point LEFT from a
// strict edge-to-edge placement, so it enters the frame sooner
// (ideally alongside the left waterfall) instead of only appearing
// after walking almost a full canvas-width into the climb zone.
const TOP_OVERLAP = -150; // canvas px — bigger number = appears sooner

const TOP_WX = CLIMB_WX + CANVAS_W - TOP_OVERLAP;

const TOP_X_ALIGN_OFFSET = -292;
const TOP_Y_ALIGN_OFFSET = -1380;



// Uses the SAME height/canvasHeight formula as baseScale() — as long
// as both pieces of art were painted at the same effective zoom for
// the shared cliff face, this keeps their rock texture at matching
// real-world size automatically. Bump this independently of
// MOUNTAIN_SCALE if the seam looks mismatched once you see it live.
const TOP_MOUNTAIN_SCALE = MOUNTAIN_SCALE;


// Canvas-space position of the wooden door within waterfall_top.png,
// eyeballed from the reference art (upper-left area of the image).
// Reaching this point in-world wins the level — see doorWorldX()
// below. Adjust these two numbers to match exactly where the door
// sits in the final exported asset.
const DOOR_CANVAS_X = 240;
const DOOR_CANVAS_Y = 140;

// Canvas-space Y (within waterfall_top.png's TOP_CANVAS_H) of the
// walkable ground line baked into the art. Tune this by eye the
// same way DOOR_CANVAS_Y was tuned — walk toward the door with
// DEBUG_COLLISION on ('P') and adjust until the red line sits on
// the rock's visible top edge.
const TOP_LEDGE_CANVAS_Y = 400;

// How far left/right (canvas px) the walkable ledge extends.
// World-space X range for the ledge — defined in world coordinates
// (not canvas-space) so it can span across BOTH waterfall.png and
// waterfall_top.png, regardless of which piece of art is visually
// underneath at a given point. Start somewhere within the left
// waterfall's footprint, end somewhere within the top canvas's.
const TOP_LEDGE_WX_START = CLIMB_WX + 500; // tune: where it starts, over waterfall.png
const TOP_LEDGE_WX_END   = TOP_WX + 1800;   // tune: where it ends, over waterfall_top.png
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
 [1034,830,1213,930],  [1121,974,1299,1038],
 [1179,615,1358,715],  [1302,809,1480,873],   [1305,909,1484,1009],
 [1358,210,1537,310],  [1363,507,1541,572],
 [1476,590,1655,690],   [1518,377,1697,477],
 [1519,968,1698,1068], [1520,54,1698,118],    [1574,293,1752,358],
 [1575,884,1753,949],  [1689,512,1868,612],   [1690,1103,1869,1203],
 [1700,154,1879,254],  [1701,745,1880,845],
];


// ── 4 extra platforms for the bottom-left corner ────────────
// platforms.png has NO rock art further left than ~x=1030 — the
// left half of the sheet is blank. So these reuse real crop rects
// from existing rocks (for actual pixel art), but are placed at
// EXPLICIT final canvas positions below, bypassing the rank-based
// computeSpreadBoxes() layout entirely — that keeps them from
// shifting the existing 17 platforms (adding them into the shared
// mean/rank computation would perturb everyone else's position).
const EXTRA_PLATFORM_SRC_BOXES = [
 [1034,830,1213,930],  // reused crop
 [1358,210,1537,310],  // reused crop
 [1520,54,1698,118],   // reused crop
 [1701,745,1880,845],  // reused crop
];
const EXTRA_PLATFORM_FINAL_CENTERS = [
 [920, 200], // moved up ~150px
 [1000, 700],
 [680, 600],
 [600, 880],
];

// Same zoom-pivot treatment as climbScreenX/topScreenX, but for a
// plain world-space x — lets something (like the ledge) span across
// multiple canvases without being anchored to any single one's
// coordinate space.
function worldScreenX(wx) {
 let rawX = toScreen(wx);
 return charX + (rawX - charX) * camZoom;
}

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
const SPREAD_FACTOR_X = 1.78;


// ── platform visibility / fade mechanic ─────────────────────
const PLATFORM_VISIBLE_FRAMES = 4 * 60;  // fully visible for 4 seconds after the camera zooms out
const PLATFORM_FADE_FRAMES    = 30;      // then fades out over this many frames
const PLATFORM_S_OPACITY_BOOST = 0.2;    // opacity added back while holding S
const S_SPEED_MULTIPLIER      = 0.15;    // walk speed while holding S (fraction of WALK_SPEED) — "A LOT" slower
let zoomOutTimer = 0; // frames since the camera finished zooming out — drives the fade


// Instead of spreading platforms outward from their group's average
// height (which caused several low-starting platforms to overshoot
// past the ground and all get clamped onto the same line), directly
// remap each platform's ORIGINAL vertical rank onto an explicit
// target span — from CLIMB_TOP_CANVAS_Y above the ground down to
// just above GROUND_TOP_CANVAS_Y. The platform that started highest
// in the source art ends up highest here; the one that started
// lowest ends up lowest — evenly distributed, guaranteed no overlap,
// no clamping required.
const CLIMB_TOP_CANVAS_Y = 1900; // how far above the ground line the highest platform sits (canvas px, pre-scale)


const MIN_LOWEST_CLEARANCE = 220; // canvas px — lowest platform sits at LEAST this far above the fail line


function computeSpreadBoxes(boxes, factorX) {
 let cx = 0;
 for (let b of boxes) cx += (b[0] + b[2]) / 2;
 cx /= boxes.length;


 let cys = boxes.map(b => (b[1] + b[3]) / 2);
 let minCy = Math.min(...cys);
 let maxCy = Math.max(...cys);


 return boxes.map((b, i) => {
   let w = b[2] - b[0], h = b[3] - b[1];
   let ctrX = (b[0] + b[2]) / 2;
   let nCtrX = cx + (ctrX - cx) * factorX;


   let t = (cys[i] - minCy) / (maxCy - minCy);
   // reserve MIN_LOWEST_CLEARANCE off the bottom of the range so
   // t=1 no longer lands right on the fail line
   let usableSpan = CLIMB_TOP_CANVAS_Y - MIN_LOWEST_CLEARANCE;
   let nCtrY = GROUND_TOP_CANVAS_Y - PLATFORM_GROUND_MARGIN - MIN_LOWEST_CLEARANCE - t * usableSpan;


   return [nCtrX - w / 2, nCtrY - h / 2, nCtrX + w / 2, nCtrY + h / 2];
 });
}


// The boxes actually used for physics + on-screen placement.
const PLATFORM_GROUND_MARGIN = 60; // canvas px of breathing room above the ground line
function clampAboveGround(boxes, srcBoxes) {
 return boxes.map((b, i) => {
   let srcH = srcBoxes[i][3] - srcBoxes[i][1];
   let halfH = srcH / 2;
   let h = b[3] - b[1];
   let cy = (b[1] + b[3]) / 2;
   let maxCy = GROUND_TOP_CANVAS_Y - halfH - PLATFORM_GROUND_MARGIN;
   if (cy > maxCy) cy = maxCy;
   return [b[0], cy - h / 2, b[2], cy + h / 2];
 });
}


// The boxes actually used for physics + on-screen placement.
const PLATFORM_BOXES = clampAboveGround(
 computeSpreadBoxes(PLATFORM_SRC_BOXES, SPREAD_FACTOR_X),
 PLATFORM_SRC_BOXES
).concat(
 // Extras use their explicit center directly — no spread or clamp
 // needed, since these positions were already chosen with ground
 // clearance built in.
 EXTRA_PLATFORM_FINAL_CENTERS.map(([cx, cy], i) => {
   let src = EXTRA_PLATFORM_SRC_BOXES[i];
   let w = src[2] - src[0], h = src[3] - src[1];
   return [cx - w/2, cy - h/2, cx + w/2, cy + h/2];
 })
);


const ALL_PLATFORM_SRC_BOXES = PLATFORM_SRC_BOXES.concat(EXTRA_PLATFORM_SRC_BOXES);


const PLATFORM_GEOM = PLATFORM_BOXES.map((b, i) => {
 const src = ALL_PLATFORM_SRC_BOXES[i]; // was PLATFORM_SRC_BOXES[i]
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
let onTopLedge = false;

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


// ── same pattern as climbScreenX/Y above, but for the second
// "design canvas" (waterfall_top.png) — its own scale (topBaseScale)
// and its own world anchor (TOP_WX) instead of CLIMB_WX/baseScale.
// Both still pivot around the same (charX, groundY()) point for zoom,
// so the two cliff pieces zoom together with no relative drift.
function topBaseScale() { return (height / TOP_CANVAS_H) * TOP_MOUNTAIN_SCALE; }

function topScreenX(cx) {
 let rawX = toScreen(TOP_WX) + (cx + TOP_X_ALIGN_OFFSET) * topBaseScale();
 return charX + (rawX - charX) * camZoom;
}
function topScreenY(cy) {
 let rawY = (cy + TOP_Y_ALIGN_OFFSET) * topBaseScale();
 let pivotY = groundY();
 return pivotY + (rawY - pivotY) * camZoom;
}

// The worldX at which the character (always drawn at fixed screen-x
// charX) visually lines up with the door. Solved from topScreenX(cx)
// == charX — recomputed fresh every frame (not a constant) since it
// depends on the current window height via topBaseScale(). Notably
// independent of camZoom: at the exact moment the door is centered
// under the character, the zoom multiplier drops out of the algebra.
function doorWorldX() {
 return TOP_WX - width*0.25 + (DOOR_CANVAS_X + TOP_X_ALIGN_OFFSET) * topBaseScale();
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
const ZOOM_TARGET  = 0.85;                   // final "pulled back" zoom level
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

function drawDebugTopLedge() {
 if (!DEBUG_COLLISION) return;
 let ledgeY = topScreenY(TOP_LEDGE_CANVAS_Y);   // was climbScreenY — fixed
 let lx0 = worldScreenX(TOP_LEDGE_WX_START);
 let lx1 = worldScreenX(TOP_LEDGE_WX_END);
 noStroke();
 fill(255, 0, 255, 180);
 rect(lx0, ledgeY - 100, lx1 - lx0, 200);
 noFill();
}

function drawDebugDoor() {
 if (!DEBUG_COLLISION) return;
 let dx = topScreenX(DOOR_CANVAS_X);
 let dy = topScreenY(DOOR_CANVAS_Y);
 noFill(); stroke(255, 255, 0); strokeWeight(3);
 ellipse(dx, dy, 40, 40);
 line(dx-25, dy, dx+25, dy);
 line(dx, dy-25, dx, dy+25);
 noStroke();

 // Also mark the actual win-trigger world position on the ground line,
 // so you can see how close your character needs to walk to trigger it.
 let winScreenX = worldScreenX(doorWorldX());
 stroke(255, 255, 0); strokeWeight(2);
 line(winScreenX, 0, winScreenX, height);
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
 imgLog       = loadImage('assets/images/log.png',                () => {}, onImgFail('log.png'));
 imgRock      = loadImage('assets/images/rock.png',                () => {}, onImgFail('rock.png'));
 imgRacoon    = loadImage('assets/images/racoon.png',              () => {}, onImgFail('racoon.png'));
 imgRabbit    = loadImage('assets/images/rabbit.png',              () => {}, onImgFail('rabbit.png'));
 imgCliffTop  = loadImage('assets/images/waterfall_top.png',       () => {}, onImgFail('waterfall_top.png'));


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
clear();


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


 if ((keyIsDown(32)||keyIsDown(87)||keyIsDown(38)) && onGround) {
   velY=JUMP_FORCE; onGround=false; standingPlatformIndex=-1;
   onTopLedge=false;
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


 // Drives the platform fade — starts counting only once the camera
 // has actually finished latching into its zoomed-out state.
 if (zoomedOut) zoomOutTimer++; else zoomOutTimer = 0;


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
     onTopLedge=false;
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

// Pass 3a: stay glued to the top ledge if we were already on it
 // (same camera-drift fix as the platform "riding" pass above).

  // Pass 3a
// Pass 3a
if (!onGround && onTopLedge) {
   let ledgeY = topScreenY(TOP_LEDGE_CANVAS_Y);   // was climbScreenY — fixed
   let lx0 = worldScreenX(TOP_LEDGE_WX_START);
   let lx1 = worldScreenX(TOP_LEDGE_WX_END);
   let withinX = charX > lx0 && charX < lx1;
   let visFeet = charY + CHAR_DRAW_OFFSET;
   let nearSurface = visFeet <= ledgeY + 8 && visFeet >= ledgeY - 8;
   if (withinX && nearSurface && velY >= 0) {
     charY = ledgeY - CHAR_DRAW_OFFSET; velY = 0; onGround = true;
   } else {
     onTopLedge = false;
   }
 }

 // Pass 3b: fresh landing on the top ledge.
if (!onGround) {
   let ledgeY = topScreenY(TOP_LEDGE_CANVAS_Y);   // was climbScreenY — fixed
   let lx0 = worldScreenX(TOP_LEDGE_WX_START);
   let lx1 = worldScreenX(TOP_LEDGE_WX_END);
   let withinX = charX > lx0 && charX < lx1;
   let prevFeet = prevY + CHAR_DRAW_OFFSET;
   let currFeet = charY + CHAR_DRAW_OFFSET;
   if (withinX && prevFeet <= ledgeY && currFeet >= ledgeY && velY > 0) {
     charY = ledgeY - CHAR_DRAW_OFFSET; velY = 0; onGround = true;
     onTopLedge = true;
     standingPlatformIndex = -1;
   }
 }
 // landing on a platform this frame "banks" the climb — falling
 // back to the base ground afterwards (before finishing the level)
 // now counts as falling off the cliff rather than a safe landing.
 if (onGround) hasClimbed = true;
 else if (!inClimbZone(worldX)) hasClimbed = false; // clear of the cliff — reset safely


 if (!onGround && charY >= gy) {
   if (hasClimbed && inClimbZone(worldX)) {
     // Falling from the waterfall climb is still an instant death —
     // but it now also wipes all 3 hearts on the way down, so the
     // HUD/lose-screen state reflects "lost everything" rather than
     // just an unrelated instant kill sitting alongside the HP bar.
     hp = 0;
     gameLost = true;
     loseReason = 'fall';
     standingPlatformIndex = -1;
     onTopLedge=false;
     if (sndDamage && sndDamage.isLoaded()) { sndDamage.stop(); sndDamage.play(); }
     if (sndMusic && sndMusic.isLoaded()) sndMusic.stop();
     return;
   }
   charY = gy; velY = 0; onGround = true;
   standingPlatformIndex = -1;
   onTopLedge=false;
 }


 updateFlip();


 for (let a of animals) {
   a.wx += a.dir * a.speed;
   if (a.wx > a.startWx+a.range || a.wx < a.startWx-a.range) a.dir *= -1;
   a.ft++; if (a.ft>=8) { a.ft=0; a.frame=(a.frame+1)%2; }
 }


 if (worldX + width*0.25 >= doorWorldX()) {
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


 // Ground obstacles (logs/rocks/animals) work exactly like Level 1:
 // a short invincibility window after each hit, otherwise check for
 // a fresh collision every frame. These only matter before the climb
 // zone, since that's where they're placed.
 if (invTimer > 0) invTimer--;
 else checkDamage();


 // The vertical pan wraps EVERYTHING that scrolls with the world
 // (background, cliff/waterfall, platforms, character) but not the
 // HUD — it's a simple screen-space shift applied on top of the
 // existing horizontal/zoom transforms, so it stays independent of
 // them. Physics (charY, climbScreenY, etc.) is untouched by this;
 // only what gets drawn moves.
// Background is drawn OUTSIDE the camPanY translate — it should
// never pan with the vertical climb, only zoom about the pivot.
drawBG();
drawObstacles();
drawAnimals();


// Climb scene (waterfall/platforms) and character DO pan with
// camPanY as the character climbs higher up the cliff.
push();
translate(0, -camPanY);

drawClimbScene(platformOpacity(revealHeld));
drawCliffTop();
drawDebugPlatformBoxes();
drawDebugDoor();
drawDebugTopLedge();   // must be HERE, inside push/pop
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
 // Explicitly CORNER here — tileLayer()'s positioning math assumes
 // it, and imageMode is global/persistent in p5, so relying on
 // whatever mode a previous draw call happened to leave behind is
 // fragile (this is exactly what broke the background tiling).
 imageMode(CORNER);
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


function drawSkyGradient(skyTop, skyBot) {
 let ctx = drawingContext; // p5's underlying 2D context
 let grad = ctx.createLinearGradient(0, 0, 0, height);
 grad.addColorStop(0, skyTop.toString());
 grad.addColorStop(1, skyBot.toString());
 ctx.fillStyle = grad;
 ctx.fillRect(0, 0, width, height);
}


drawSkyGradient(skyTop, skyBot);


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
   tileLayer(imgGround, height, 0, worldX*SCROLL_GROUND, GROUND_GROWTH, true);
 tileLayer(imgTrees,   height, -225, worldX*SCROLL_GROUND, TREES_GROWTH,  true);
}


function platformOpacity(revealHeld) {
 let base;
 if (zoomOutTimer < PLATFORM_VISIBLE_FRAMES) {
   base = 1;
 } else {
   let t = (zoomOutTimer - PLATFORM_VISIBLE_FRAMES) / PLATFORM_FADE_FRAMES;
   base = constrain(1 - t, 0, 1);
 }
 return revealHeld ? constrain(base + PLATFORM_S_OPACITY_BOOST, 0, 1) : base;
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
// in drawClimbScene(), right after the leftSX/rightSX check:
if (frameCount % 15 === 0) console.log('LEFT waterfall visible, worldX =', worldX, 'leftSX=', leftSX);

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
// Use the image's ACTUAL pixel size for the source crop, instead of
 // assuming it matches the 1901x1528 design canvas — if the real
 // file's dimensions differ even slightly, sampling with hardcoded
 // canvas numbers pulls the wrong pixels and reads as stretching.
 let srcW = imgWaterfall.width;
 let srcH = imgWaterfall.height;
 let cropXReal = (520 / CANVAS_W) * srcW;      // same proportional crop, scaled to actual size
 let cropWReal = srcW - cropXReal;


 let cropCenterCanvasX = 608 + (CANVAS_W - 608) / 2;
 let cropCenterCanvasY = CANVAS_H / 2;
 let waterfallCenterX = climbScreenX(cropCenterCanvasX);
 let waterfallCenterY = climbScreenY(cropCenterCanvasY) - WATERFALL_Y_SHIFT * s;


 // Destination size still driven by the design-canvas proportions
 // (so it lines up with platforms/collision), but built from the
 // real source aspect ratio so nothing distorts.
 let waterfallW = (cropWReal / srcW) * CANVAS_W * waterfallScale;
 let waterfallH = CANVAS_H * waterfallScale;
 let waterfallDX = waterfallCenterX - waterfallW / 2;
 let waterfallDY = waterfallCenterY - waterfallH / 2;


 image(imgWaterfall, waterfallDX, waterfallDY, waterfallW, waterfallH, cropXReal, 0, cropWReal, srcH);


 // Each stone ledge is drawn as its own cropped sprite, positioned
 // from the same center-based geometry (PLATFORM_GEOM) the
 // collision check uses above — so the drawn rock and the box you
 // can actually stand on are always identical in size and position.
// Platforms fade independently of the waterfall — tint only applies
 // to this loop, not the waterfall drawn above it.
 tint(255, opacity * 255);
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
 noTint();
 imageMode(CENTER);
}

// ─────────────────────────────────────────────────────────
// Draws waterfall_top.png — the continuation of the cliff past the
// end of the main waterfall canvas. Uses the exact same "anchor +
// scale, then draw the whole thing" approach as drawClimbScene(),
// just against the TOP_* constants/topScreenX/topScreenY instead.
// How far to nudge waterfall_top.png vertically (canvas-space px,
// pre-scale) to line up its ground contact with groundY() — same
// role as WATERFALL_Y_SHIFT plays for the left waterfall.
const TOP_Y_SHIFT = 0; // tune this by eye once the base position is correct

function drawCliffTop() {
 if (!imgCliffTop) return;

 let leftSX  = topScreenX(0);
 let rightSX = topScreenX(TOP_CANVAS_W);
 if (rightSX < -50 || leftSX > width+50) { 
   // in drawCliffTop(), right after its own leftSX/rightSX check:
if (frameCount % 15 === 0) console.log('RIGHT cliff visible, worldX =', worldX, 'leftSX=', leftSX);
 }

 let centerCanvasX = TOP_CANVAS_W / 2;
 let centerCanvasY = TOP_CANVAS_H / 2;
 let centerScreenX = topScreenX(centerCanvasX);
 let centerScreenY = topScreenY(centerCanvasY) - TOP_Y_SHIFT * (topBaseScale() * camZoom);

 let s2 = topBaseScale() * camZoom * TOP_DRAW_SCALE;
 let dw = TOP_CANVAS_W * s2;
 let dh = TOP_CANVAS_H * s2;
 let dx = centerScreenX - dw / 2;
 let dy = centerScreenY - dh / 2;

 if (frameCount % 30 === 0) {
   console.log('cliffTop draw', {dx, dy, dw, dh, imgW: imgCliffTop.width, imgH: imgCliffTop.height});
 }

 imageMode(CORNER);
 image(imgCliffTop, dx, dy, dw, dh);
 imageMode(CENTER);
}


// ─────────────────────────────────────────────────────────
// ── ground obstacles (reused from Level 1) ──────────────────
function drawObstacles() {
 // groundY() is the physics ground line the character's feet sit on,
 // but the character sprite itself is drawn CHAR_DRAW_OFFSET pixels
 // higher (see drawChar) to compensate for empty padding baked into
 // the sprite frame. Obstacles don't have that padding, so without
 // the same correction they'd render sunk below the character's
 // visible feet — applying it here puts them on the same visible
 // ground line.
 let gy=groundY()+CHAR_DRAW_OFFSET;
 let logH=height*0.10, logW=logH*(139/88);
 let rockH=height*0.08, rockW=rockH*(117/66);
 imageMode(CORNER);
 for (let o of LOGS) {
   let sx=toScreen(o.wx);
   if (sx<-200||sx>width+200) continue;
   image(imgLog,sx,gy-logH,logW,logH,258,46,139,88);
 }
 for (let o of ROCKS) {
   let sx=toScreen(o.wx);
   if (sx<-200||sx>width+200) continue;
   image(imgRock,sx,gy-rockH,rockW,rockH,115,56,117,66);
 }
}


function drawAnimals() {
 let gy=groundY()+CHAR_DRAW_OFFSET; // same visual correction as drawObstacles
 imageMode(CORNER);
 for (let a of animals) {
   let sx=toScreen(a.wx);
   if (sx<-200||sx>width+200) continue;
   if (a.type==='racoon') {
     let dh=height*0.09, dw=dh*(74/72), srcX=18+a.frame*74;
     if (a.dir<0) { push(); translate(sx+dw,gy-dh); scale(-1,1); image(imgRacoon,0,0,dw,dh,srcX,288,74,72); pop(); }
     else         { image(imgRacoon,sx,gy-dh,dw,dh,srcX,288,74,72); }
   } else {
     let dh=height*0.08, dw=dh*(95/80), srcX=a.frame*95;
     if (a.dir<0) { push(); translate(sx+dw,gy-dh); scale(-1,1); image(imgRabbit,0,0,dw,dh,srcX,80,95,80); pop(); }
     else         { image(imgRabbit,sx,gy-dh,dw,dh,srcX,80,95,80); }
   }
 }
}


// checkDamage/takeDamage mirror Level 1's obstacle-hit logic exactly
// (one heart per hit, brief invincibility window) — the only hazard
// type NOT handled here is the waterfall fall, which stays an
// immediate, separate death handled up in draw() above.
function checkDamage() {
 let gy=groundY();
 if (charY<gy-height*0.05) return;


 let pw=width*0.010, px1=charX-pw, px2=charX+pw;
 let logH=height*0.10, logW=logH*(139/88);
 let rockH=height*0.08, rockW=rockH*(117/66);


 for (let o of LOGS) {
   let sx=toScreen(o.wx);
   if (px2>sx+16&&px1<sx+logW-16) { takeDamage(); return; }
 }
 for (let o of ROCKS) {
   let sx=toScreen(o.wx);
   if (px2>sx+16&&px1<sx+rockW-16) { takeDamage(); return; }
 }
 for (let a of animals) {
   let sx=toScreen(a.wx);
   let dw=a.type==='racoon'?height*0.09*(74/72):height*0.08*(95/80);
   if (px2>sx+12&&px1<sx+dw-12) { takeDamage(); return; }
 }
}


function takeDamage() {
 hp--; invTimer=INV_FRAMES;
 if (sndDamage && sndDamage.isLoaded()) { sndDamage.stop(); sndDamage.setVolume(0.15); sndDamage.play(); }
 if (hp<=0) {
   hp=0; gameLost=true; loseReason='hurt';
   if (sndMusic && sndMusic.isLoaded()) sndMusic.stop();
 }
}


// ─────────────────────────────────────────────────────────
function drawChar() {
 if (!imgSprites) return; // guard against a failed load


 let dispH=height*0.20*camZoom, dispW=dispH*(119/135);
 let drawX=charX-dispW/2, drawY=charY-dispH + CHAR_DRAW_OFFSET;
 imageMode(CORNER);
 push();
 if (facingLeft) { translate(drawX+dispW,drawY); scale(-1,1); }
 else            { translate(drawX,drawY); }
 image(imgSprites,0,0,dispW,dispH,animFrame*119,0,119,135);
 pop();
}


// ─────────────────────────────────────────────────────────
function drawPixelHeart(x,y,s,full) {
 let p=s/4;
 let g=[[0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]];
 noStroke();
 for (let r=0;r<5;r++) for (let c=0;c<5;c++) {
   if (!g[r][c]) continue;
   if (full) fill(r<2&&c<2?color(230,100,110):color(195,48,58));
   else fill(60,45,45);
   rect(x+c*p,y+r*p,p,p);
 }
 if (invTimer>0&&floor(invTimer/5)%2===0) {
   fill(255,255,255,160);
   for (let r=0;r<5;r++) for (let c=0;c<5;c++) if (g[r][c]) rect(x+c*p,y+r*p,p,p);
 }
}


// ─────────────────────────────────────────────────────────
function drawHUD() {
 let pad=width*0.018, hs=height*0.038;
 for (let i=0;i<MAX_HP;i++) drawPixelHeart(pad+i*(hs*1.4), pad, hs, i<hp);


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
   text('DEBUG COLLISION ON (press P to toggle)', pad, pad + hs + 6);
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
     text('use A / D to move    SPACE to jump    hold S to regain what you just saw... but it\'ll come at a price',width/2,height/2+height*0.08);
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
 let headline = loseReason === 'fall' ? 'lost to the falls'
              : loseReason === 'hurt' ? 'lost to the canyon'
              : 'lost to the canyon';
 let subtext  = loseReason === 'fall' ? 'she slipped from the rocks and the current took her.'
              : loseReason === 'hurt' ? 'the canyon\'s dangers proved too much for her.'
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
 textSize(height*0.055); text('She climbed above today\'s dangers',width/2,height/2-28);
 textStyle(NORMAL); textSize(height*0.024); fill(50,95,110);
 text('They survived another day!',width/2,height/2+22);
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
   hp=MAX_HP; invTimer=0;
   velY=0; onGround=true;
   charX=width*0.25; charY=groundY();
   hasClimbed=false;
   standingPlatformIndex=-1;
   onTopLedge=false;
   zoomOutTimer=0;
   camZoom=1; zoomedOut=false; camPanY=0;
   animals.forEach(a=>{a.wx=a.startWx;a.frame=0;a.ft=0;});
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

