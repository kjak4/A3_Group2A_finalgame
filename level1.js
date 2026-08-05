// ─────────────────────────────────────────────────────────
//  THROUGH THE TREES — Tutorial Level
// ─────────────────────────────────────────────────────────

let imgSky, imgBgTrees, imgBushes, imgGround, imgFgTrees;
let imgSprites, imgLog, imgRock, imgRacoon, imgRabbit;
let imgSign, imgPlatform, imgPlatform2, imgFloatingPlat, imgFinishSign;
let imgTitleScreen;

// ── Title screen state ─────────────────────────────────────
// Shown before anything else. The player clicks "Start Game" to
// move on to the existing Tutorial/intro overlay and then gameplay.
let showTitleScreen = true;
let startBtn = { x:0, y:0, w:0, h:0 }; // recomputed every frame, used for click hit-testing
let nextLevelBtn = { x:0, y:0, w:0, h:0 };
let titleImgRect = { x:0, y:0, w:0, h:0 }; // where the letterboxed art actually sits on screen

// ── Sound variables ────────────────────────────────────────
let sndMusic, sndJump, sndDamage, sndWin, sndWalk;
let walkSoundTimer = 0;
let audioStarted    = false;   // has the AudioContext been resumed yet?

// Loading the sound FILES doesn't need the AudioContext running —
// only actually *playing* them does. So they're loaded in preload()
// like everything else, guaranteeing they're ready by the time the
// game starts (no more racing the first jump/keypress).
function loadSounds() {
  if (typeof loadSound === 'undefined') return;   // p5.sound not included — bail safely
  // every call gets a success + error callback so a single missing/broken
  // sound file can NOT hang preload() forever (which would block setup()
  // from ever running — createCanvas lives there, so that means a blank screen)
  sndMusic  = loadSound('assets/sounds/music.mp3',   () => {}, () => { console.warn('music.mp3 failed to load');   sndMusic  = null; });
  sndJump   = loadSound('assets/sounds/jump.mp3',    () => {}, () => { console.warn('jump.mp3 failed to load');    sndJump   = null; });
  sndDamage = loadSound('assets/sounds/damage.mp3',  () => {}, () => { console.warn('damage.mp3 failed to load');  sndDamage = null; });
  sndWin    = loadSound('assets/sounds/win.mp3',     () => {}, () => { console.warn('win.mp3 failed to load');     sndWin    = null; });
  sndWalk   = loadSound('assets/sounds/walking.mp3', () => {}, () => { console.warn('walking.mp3 failed to load'); sndWalk   = null; });
}

// Browsers block audio until a real user gesture (keypress/click)
// resumes the AudioContext. This is almost always why sounds "don't
// work" even though everything else is wired up correctly — the
// files load fine, but .play() is silently ignored until this runs.
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
let isMoving   = false;

const GRAVITY    = 0.65;
const JUMP_FORCE = -18;
const WALK_SPEED = 4;

let worldX      = 0;
const LEVEL_END = 8500;
const FINISH_SIGN_X = LEVEL_END - 150; // world position of the "you made it" sign — win triggers here, not at LEVEL_END
let gameWon     = false;
let gameLost    = false;

let hp           = 3;
const MAX_HP     = 3;
let invTimer     = 0;
const INV_FRAMES = 80;

let levelTimer      = 0;
const TIME_LIMIT    = 90 * 60;

const INTRO_DISPLAY_FRAMES = 10 * 60;
const INTRO_FADE_FRAMES = 60;
let introTimer = INTRO_DISPLAY_FRAMES + INTRO_FADE_FRAMES;
let introFadeStarted = false;

const FLIP_AT       = [700, 5200];
let   flipIndex     = 0;
let   flipped       = false;
let   flipTimer     = 0;
const FLIP_DURATION = 320;
let   countdown     = 0;
let   countdownTimer = 0;
const COUNTDOWN_FRAMES = 55;

const LOGS  = [{ wx:2200 }, { wx:3600 }, { wx:4800 }];
const ROCKS = [{ wx:1500 }, { wx:2900 }, { wx:4200 }];

let animals = [
  { wx:2600, type:'rabbit', dir: 1, range:110, speed:2.0, frame:0, ft:0 },
  { wx:4000, type:'racoon', dir: 1, range: 90, speed:1.5, frame:0, ft:0 },
];
animals.forEach(a => a.startWx = a.wx);

const PIT_START  = 5600;
const PIT_END    = 6400;

const PLATFORMS = [
  { wx: 5650, wyOff: 0.20 },
  { wx: 5920, wyOff: 0.28 },
  { wx: 6200, wyOff: 0.20 },
  { wx: 6480, wyOff: 0.12 },
];
const PLAT_W = 115;
const PLAT_H = 28;

function groundH() { return height * 0.44; }
function groundY() { return height - groundH() * 0.5; }
function toScreen(worldPos) { return worldPos - worldX + charX - width * 0.25; }
function platY(p) { return groundY() - groundY() * p.wyOff; }

// ─────────────────────────────────────────────────────────
function preload() {
  const onImgFail = (name) => (err) => {
    console.warn(name + ' failed to load — check the path/case.', err);
  };

  imgBgTrees   = loadImage('assets/images/Asset 11.png', () => {}, onImgFail('Asset 11.png'));
  imgBushes    = loadImage('assets/images/Asset 9.png', () => {}, onImgFail('Asset 9.png'));
  imgGround    = loadImage('assets/images/Asset 10.png', () => {}, onImgFail('Asset 10.png'));
  imgFgTrees   = loadImage('assets/images/Asset 8.png', () => {}, onImgFail('Asset 8.png'));
  imgSprites   = loadImage('assets/images/sprites2.png', () => {}, onImgFail('sprites2.png'));
  imgLog       = loadImage('assets/images/log.png', () => {}, onImgFail('log.png'));
  imgRock      = loadImage('assets/images/rock.png', () => {}, onImgFail('rock.png'));
  imgRacoon    = loadImage('assets/images/racoon.png', () => {}, onImgFail('racoon.png'));
  imgRabbit    = loadImage('assets/images/rabbit.png', () => {}, onImgFail('rabbit.png'));
  imgSign      = loadImage('assets/images/sign.png', () => {}, onImgFail('sign.png'));
  imgPlatform  = loadImage('assets/images/platform.png', () => {}, onImgFail('platform.png'));
  imgPlatform2 = loadImage('assets/images/platform2.png', () => {}, onImgFail('platform2.png'));
  imgFloatingPlat = loadImage('assets/images/floatingplat.png', () => {}, onImgFail('floatingplat.png'));
  imgFinishSign= loadImage('assets/images/youmadeit.png', () => {}, onImgFail('youmadeit.png'));
  imgTitleScreen = loadImage('assets/images/titlescreen.PNG', () => {}, onImgFail('titlescreen.PNG'));


  // NOTE: sounds are deliberately NOT loaded here. p5.sound's preload
  // tracking does not reliably resolve on a failed/missing file even
  // with an error callback, which can hang preload() forever and
  // block setup() — and therefore createCanvas() — from ever running.
  // Sounds are loaded separately in setup() instead, fully decoupled
  // from preload's blocking wait. Every .play()/.stop() call already
  // checks .isLoaded(), so this is safe even if a file never arrives.
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CORNER);
  charX = width * 0.25;
  charY = groundY();
  loadSounds();   // decoupled from preload — can't block canvas creation
 
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (onGround) charY = groundY();
}

// ─────────────────────────────────────────────────────────
function draw() {
  if (showTitleScreen) { drawTitleScreen(); return; }

  startAudioOnce();

  if (gameWon)  { drawWinScreen();  return; }
  if (gameLost) { drawLoseScreen(); return; }

  if (introTimer > 0) {
    introTimer--;
    drawBG(); drawStartSign(); drawChar(); drawFG(); drawIntroOverlay();
    return;
  }

  isMoving = false;
  let movingInput = keyIsDown(65) || keyIsDown(37) || keyIsDown(68) || keyIsDown(39);
  let goLeft  = flipped ? (keyIsDown(68)||keyIsDown(39)) : (keyIsDown(65)||keyIsDown(37));
  let goRight = flipped ? (keyIsDown(65)||keyIsDown(37)) : (keyIsDown(68)||keyIsDown(39));
  if (goLeft)  { worldX -= WALK_SPEED; if (worldX<0) worldX=0; facingLeft=true;  isMoving=true; }
  if (goRight) { worldX += WALK_SPEED; facingLeft=false; isMoving=true; }

  // Jump sound
  if ((keyIsDown(32)||keyIsDown(87)||keyIsDown(38)) && onGround) {
    velY=JUMP_FORCE; onGround=false;
    if (sndJump && sndJump.isLoaded()) { sndJump.stop(); sndJump.setVolume(0.1); sndJump.play(); }
  }

  // Walking sound

  if (movingInput && isMoving && onGround) {
    walkSoundTimer++;
    if (walkSoundTimer >= 22) {
      walkSoundTimer = 0;
      if (sndWalk && sndWalk.isLoaded() && !sndWalk.isPlaying()) {
        sndWalk.stop();
        sndWalk.setVolume(2);
        sndWalk.play();
      }
    }
  } else { walkSoundTimer = 0; }

  if (isMoving) {
    animTimer++;
    if (animTimer>=ANIM_SPEED) { animTimer=0; animFrame=(animFrame+1)%NUM_FRAMES; }
  } else { animFrame=0; animTimer=0; }

  velY  += GRAVITY;
  charY += velY;
  let gy = groundY();

  onGround = false;
  for (let p of PLATFORMS) {
    let psx = toScreen(p.wx);
    let py  = platY(p);
    let prevFeet = charY - velY;
    if (charX > psx && charX < psx + PLAT_W) {
      if (prevFeet <= py && charY >= py && velY > 0) {
        charY = py; velY = 0; onGround = true;
      }
    }
  }
  if (charY >= gy) { charY=gy; velY=0; onGround=true; }

  updateFlip();

  for (let a of animals) {
    a.wx += a.dir * a.speed;
    if (a.wx > a.startWx+a.range || a.wx < a.startWx-a.range) a.dir *= -1;
    a.ft++; if (a.ft>=8) { a.ft=0; a.frame=(a.frame+1)%2; }
  }

  if (worldX + width*0.25 >= FINISH_SIGN_X) {
    gameWon=true;
    if (sndWin && sndWin.isLoaded()) sndWin.play();
    if (sndMusic && sndMusic.isLoaded()) sndMusic.stop(); sndMusic.setVolume(0.01);
    return;
  }
  levelTimer++;
  if (invTimer > 0) invTimer--;
  else checkDamage();

  drawBG();
  drawStartSign();
  drawPit();
  drawPlatforms();
  drawObstacles();
  drawAnimals();
  drawFinishSign();
  drawChar();
  drawFG();
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
function tileLayer(img, destH, destY, scrollAmt) {
  if (!img) return;
  let scale=destH/img.height, tileW=img.width*scale;
  let offset=((scrollAmt*scale)%tileW+tileW)%tileW;
  let n=ceil(width/tileW)+2;
  for (let i=-1;i<n;i++) image(img,i*tileW-offset,destY,tileW,destH);
}

function drawBG() {
  let bgScroll = min(worldX, LEVEL_END - 800);
  let progress = min(levelTimer / TIME_LIMIT, 1);

  let skyTop, skyBot;
  if (progress < 0.35) {
    let t = progress / 0.35;
    skyTop = lerpColor(color(118,158,158), color(155,130,100), t);
    skyBot = lerpColor(color(145,185,180), color(210,175,120), t);
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

  tileLayer(imgBgTrees, height, 0, bgScroll*0.12);
  let bushH = height*0.30;
  tileLayer(imgBushes, bushH, height-bushH-groundH()*0.50, bgScroll*0.04);
  tileLayer(imgGround, groundH(), height-groundH(), worldX*0.45);
}

function drawFG() { tileLayer(imgFgTrees, height, 0, worldX*1.15); }

// ─────────────────────────────────────────────────────────
function drawPit() {
  let gy  = groundY();
  let psx = toScreen(PIT_START);
  let pex = toScreen(PIT_END);
  let pitW = pex - psx;
  if (pex < -10 || psx > width+10) return;

  let pitBottom = height;
  let pitDepth  = pitBottom - gy;

  // ── jagged "torn earth" opening ──────────────────────────
  // noise() is deterministic for a given input, so this jitter is
  // fixed per position rather than per-frame — the broken edge holds
  // still instead of flickering, matching the slightly irregular
  // hand-drawn linework used elsewhere (tree trunks, sign post).
  let jagN = 16;
  let topPts = [];
  for (let i=0;i<=jagN;i++) {
    let t  = i/jagN;
    let jx = psx + pitW*t;
    let jy = gy + (noise(i*0.6, 4.2) - 0.5) * height*0.035;
    topPts.push([jx, jy]);
  }

  // ── pit body: flat dusty-brown fill, darkening toward the ──
  // bottom in solid bands rather than a smooth gradient — the
  // reference art is flat/cel-shaded, not painterly.
  noStroke();
  fill(60, 44, 30);
  beginShape();
  for (let pt of topPts) vertex(pt[0], pt[1]);
  vertex(pex, pitBottom);
  vertex(psx, pitBottom);
  endShape(CLOSE);

  fill(34, 23, 15);
  rect(psx, gy + pitDepth*0.4, pitW, pitDepth*0.6);

  fill(16, 11, 7);
  rect(psx, gy + pitDepth*0.75, pitW, pitDepth*0.25);

  // ── bold black outline along the torn edge and down each ──
  // side wall — the reference art outlines every shape heavily,
  // so the pit needs the same treatment to read as part of the
  // same world.
  stroke(8, 6, 5); strokeWeight(4);
  noFill();
  beginShape();
  for (let pt of topPts) vertex(pt[0], pt[1]);
  endShape();
  line(psx, topPts[0][1], psx, pitBottom);
  line(pex, topPts[topPts.length-1][1], pex, pitBottom);
  noStroke();

  // ── thin dangling roots at the broken lip, silhouetted the ──
  // same near-black as the trees for visual consistency
  fill(15, 20, 16);
  for (let i=2;i<topPts.length-2;i+=3) {
    let rx = topPts[i][0], ry = topPts[i][1];
    let rl = height*0.018 + noise(i*1.3, 9.1)*height*0.022;
    beginShape();
    vertex(rx-3, ry);
    vertex(rx+3, ry);
    vertex(rx+1, ry+rl);
    vertex(rx-1, ry+rl);
    endShape(CLOSE);
  }

  // ── loose dirt clumps scattered along the rim ────────────
  fill(80, 60, 40);
  for (let i=0;i<topPts.length-1;i+=2) {
    let cx = topPts[i][0], cy = topPts[i][1];
    ellipse(cx + 10, cy - 4, 16, 9);
  }

  fill(155,115,45,180);
  textAlign(CENTER,CENTER); textFont('monospace'); textStyle(BOLD);
  textSize(height*0.020);
  text('!', psx-25, groundY()-height*0.06);
  text('!', psx-48, groundY()-height*0.06);
  textStyle(NORMAL);
}

// ─────────────────────────────────────────────────────────
function drawPlatforms() {
  // floatingplat.png is a standalone 291x194 image (not a spritesheet
  // crop like platform2.png was). We draw it a bit larger than the
  // PLAT_W landing hitbox for visual presence, but the extra size is
  // centered on the hitbox (and only grows downward, not upward) so
  // the actual walkable surface — where the player's feet land — still
  // sits exactly at platY(p), and jump/landing detection is unchanged.
  let PLAT_VISUAL_SCALE = 1.25;
  let plW = PLAT_W * PLAT_VISUAL_SCALE;
  let plH = plW * (194 / 291);
  let xOffset = (plW - PLAT_W) / 2; // extra width split evenly left/right
  imageMode(CORNER);
  for (let p of PLATFORMS) {
    let sx = toScreen(p.wx);
    let py = platY(p);
    if (sx < -PLAT_W-40 || sx > width+40) continue;
    image(imgFloatingPlat, sx - xOffset, py, plW, plH);
  }
  imageMode(CENTER);
}

// ─────────────────────────────────────────────────────────
function drawObstacles() {
  let gy=groundY();
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

// ─────────────────────────────────────────────────────────
function drawAnimals() {
  let gy=groundY();
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

// ─────────────────────────────────────────────────────────
function drawStartSign() {
  let sx=toScreen(120), gy=groundY();
  if (sx<-300||sx>width+300) return;
  let dh=height*0.28, dw=dh*(197/268);
  imageMode(CORNER);
  image(imgSign, sx-dw*0.3, gy-dh, dw, dh, 47, 71, 197, 268);
  imageMode(CENTER);
}

// ─────────────────────────────────────────────────────────
function drawFinishSign() {
  let sx=toScreen(FINISH_SIGN_X), gy=groundY();
  if (sx<-300||sx>width+300) return;
  let dh=height*0.28, dw=dh*(300/400);
  imageMode(CORNER);
  image(imgFinishSign, sx-dw*0.3, gy-dh, dw, dh);
  imageMode(CENTER);
}

// ─────────────────────────────────────────────────────────
function drawChar() {
  let dispH=height*0.20, dispW=dispH*(119/135);
  let drawX=charX-dispW/2, drawY=charY-dispH;
  imageMode(CORNER);
  push();
  if (facingLeft) { translate(drawX+dispW,drawY); scale(-1,1); }
  else            { translate(drawX,drawY); }
  image(imgSprites,0,0,dispW,dispH,animFrame*119,0,119,135);
  pop();
}

// ─────────────────────────────────────────────────────────
function checkDamage() {
  let gy=groundY();
  let worldPlayerX=worldX;
  let inPitX=worldPlayerX+width*0.25>PIT_START+60&&worldPlayerX+width*0.25<PIT_END-60;
  let fallingIn=!onGround&&charY>gy-height*0.10&&velY>2;
  if (inPitX&&fallingIn) { gameLost=true; if (sndMusic && sndMusic.isLoaded()) sndMusic.stop(); return; }

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
  if (hp<=0) { hp=0; gameLost=true; if (sndMusic && sndMusic.isLoaded()) sndMusic.stop(); }
}

// ─────────────────────────────────────────────────────────
function drawHUD() {
  let pad=width*0.018, hs=height*0.038;
  for (let i=0;i<MAX_HP;i++) drawPixelHeart(pad+i*(hs*1.4), pad, hs, i<hp);

  let progress=min(levelTimer/TIME_LIMIT, 1);
  if (progress>0.82) {
    let a=map(progress,0.82,1.0,0,200);
    fill(200,185,215,a);
    textAlign(CENTER,TOP); textFont('Georgia'); textStyle(ITALIC);
    textSize(height*0.020);
    if (floor(frameCount/25)%2===0||progress<0.92) text('the light is fading...',width/2,pad);
    textStyle(NORMAL);
  }
}

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
function drawFlipHUD() {
  if (!flipped && countdown > 0) {
    noStroke(); fill(0,0,0,55); rect(0,0,width,height);
    let cx=width/2, cy=height/2;
    if (floor(frameCount/6)%2===0) { noFill(); stroke(200,220,180,140); strokeWeight(3); ellipse(cx,cy,height*0.38,height*0.38); noStroke(); }
    fill(20,35,18,180); ellipse(cx,cy,height*0.32,height*0.32);
    stroke(120,160,90,200); strokeWeight(2); noFill(); ellipse(cx,cy,height*0.32,height*0.32); noStroke();
    textAlign(CENTER,CENTER); textFont('Georgia'); textStyle(BOLD); textSize(height*0.14);
    fill(0,0,0,160); text(str(countdown),cx+3,cy+3);
    fill(210,230,185); text(str(countdown),cx,cy);
    textSize(height*0.024); textStyle(NORMAL);
    fill(0,0,0,140); text('controls changing',cx+2,cy+height*0.21+2);
    fill(190,215,165); text('controls changing',cx,cy+height*0.21);
  }

  if (flipped) {
    let cx=width/2, ty=height*0.38, msg='controls flipped';
    textFont('Georgia'); textStyle(BOLD); textSize(height*0.040);
    let tw=textWidth(msg), pw=tw+60, ph=height*0.072;
    let px=cx-pw/2, py=ty-ph/2;
    noStroke(); fill(0,0,0,100); rect(px+3,py+3,pw,ph,ph/2);
    fill(32,48,28,210); rect(px,py,pw,ph,ph/2);
    stroke(110,155,80,200); strokeWeight(2); noFill(); rect(px+3,py+3,pw-6,ph-6,ph/2); noStroke();
    fill(90,140,65,200); ellipse(px+14,ty,12,7); ellipse(px+pw-14,ty,12,7);
    textAlign(CENTER,CENTER);
    fill(0,0,0,160); text(msg,cx+2,ty+2);
    fill(210,235,175); text(msg,cx,ty);
    textStyle(NORMAL);

    let timeLeft=flipTimer;
    if (timeLeft<=180) {
      let endMsg=timeLeft<=60?'1':timeLeft<=120?'2':'3';
      let warningAlpha=timeLeft<=60?255:map(timeLeft,180,120,100,220);
      textFont('Georgia'); textStyle(BOLD); textSize(height*0.022);
      let ww=textWidth('controls returning')+40, wh=height*0.042;
      let wx2=cx-ww/2, wy=ty+ph/2+12;
      noStroke(); fill(0,0,0,80); rect(wx2+2,wy+2,ww,wh,wh/2);
      fill(80,55,28,warningAlpha); rect(wx2,wy,ww,wh,wh/2);
      stroke(180,140,60,warningAlpha); strokeWeight(1); noFill();
      rect(wx2+2,wy+2,ww-4,wh-4,wh/2); noStroke();
      textAlign(CENTER,CENTER); fill(235,200,130,warningAlpha);
      text('controls returning in '+endMsg, cx, wy+wh/2);
      if (timeLeft<=60&&floor(frameCount/6)%2===0) {
        noFill(); stroke(210,165,40,180); strokeWeight(5);
        rect(4,4,width-8,height-8); noStroke();
      }
      textStyle(NORMAL);
    }
    if (floor(frameCount/12)%2===0) { noFill(); stroke(110,155,80,80); strokeWeight(3); rect(4,4,width-8,height-8); noStroke(); }
  }
}

// ─────────────────────────────────────────────────────────
function drawTitleScreen() {
  // Fill the full canvas first — this becomes the letterbox/pillarbox
  // bar color if the artwork's 3:2 ratio doesn't match the browser
  // window's ratio, instead of stretching the art to fill the screen.
  background(18, 12, 26);

  if (imgTitleScreen && imgTitleScreen.width > 0) {
    let imgAspect    = imgTitleScreen.width / imgTitleScreen.height; // 1800/1200 = 1.5
    let canvasAspect = width / height;
    let dw, dh, dx, dy;

    if (canvasAspect > imgAspect) {
      // window is relatively wider than the art -> fit to full height,
      // letterbox (bars) appear on the left/right
      dh = height;
      dw = dh * imgAspect;
      dx = (width - dw) / 2;
      dy = 0;
    } else {
      // window is relatively taller/narrower than the art -> fit to
      // full width, letterbox (bars) appear on the top/bottom
      dw = width;
      dh = dw / imgAspect;
      dx = 0;
      dy = (height - dh) / 2;
    }

    imageMode(CORNER);
    image(imgTitleScreen, dx, dy, dw, dh);
    titleImgRect.x = dx; titleImgRect.y = dy; titleImgRect.w = dw; titleImgRect.h = dh;
  } else {
    // no image yet (still loading) — fall back to the full canvas so
    // the button still has somewhere sensible to sit
    titleImgRect.x = 0; titleImgRect.y = 0; titleImgRect.w = width; titleImgRect.h = height;
  }

  drawStartButton();
}

function drawNextLevelButton() {
  let bw = min(width*0.28, 260);
  let bh = min(height*0.09, 64);
  let bx = width/2 - bw/2;
  let by = height/2 + 90; // sits below the win text — adjust to taste
  nextLevelBtn.x = bx; nextLevelBtn.y = by; nextLevelBtn.w = bw; nextLevelBtn.h = bh;

  if (floor(frameCount/20)%2===0) {
    noFill(); stroke(200,230,160,150); strokeWeight(3);
    rect(bx-5, by-5, bw+10, bh+10, bh/2+5); noStroke();
  }
  noStroke(); fill(0,0,0,120); rect(bx+3, by+3, bw, bh, bh/2);
  fill(90,55,20,235); rect(bx, by, bw, bh, bh/2);
  stroke(200,160,90,220); strokeWeight(2); noFill();
  rect(bx+2, by+2, bw-4, bh-4, (bh-4)/2); noStroke();

  fill(255,248,235);
  textAlign(CENTER,CENTER); textFont('Georgia'); textStyle(BOLD);
  textSize(bh*0.32);
  text('Go to Level 2', bx+bw/2, by+bh/2);
  textStyle(NORMAL);
}

function drawStartButton() {
  let bw = min(titleImgRect.w*0.20, 260);
  let bh = min(titleImgRect.h*0.085, 70);
  let bx = titleImgRect.x + titleImgRect.w - bw - titleImgRect.w*0.035;
  let by = titleImgRect.y + titleImgRect.h - bh - titleImgRect.h*0.05;
  startBtn.x = bx; startBtn.y = by; startBtn.w = bw; startBtn.h = bh;

  // soft pulsing glow ring to signal "this is clickable"
  if (floor(frameCount/20)%2===0) {
    noFill(); stroke(200,230,160,120); strokeWeight(3);
    rect(bx-5, by-5, bw+10, bh+10, bh/2+5); noStroke();
  }

  noStroke(); fill(0,0,0,120); rect(bx+3, by+3, bw, bh, bh/2);
  fill(32,48,28,235); rect(bx, by, bw, bh, bh/2);
  stroke(140,190,100,220); strokeWeight(2); noFill();
  rect(bx+2, by+2, bw-4, bh-4, (bh-4)/2); noStroke();

  fill(225,240,200);
  textAlign(CENTER,CENTER); textFont('Georgia'); textStyle(BOLD);
  textSize(bh*0.34);
  text('Start Game', bx+bw/2, by+bh/2);
  textStyle(NORMAL);
}

// ─────────────────────────────────────────────────────────
function drawIntroOverlay() {
  let alpha = introTimer <= INTRO_FADE_FRAMES
    ? constrain(map(introTimer, INTRO_FADE_FRAMES, 0, 220, 0), 0, 220)
    : 220;

  noStroke(); fill(15,22,14,alpha); rect(0,0,width,height);
  if (introTimer > INTRO_FADE_FRAMES) {
    let ta = 255;
    textAlign(CENTER,CENTER); textFont('Georgia');
    fill(0,0,0,ta*0.6); textStyle(NORMAL); textSize(height*0.022);
    text('Tutorial',width/2+2,height/2-height*0.06+2);
    textStyle(BOLD); textSize(height*0.058);
    text('Through the Trees',width/2+3,height/2+3);
    fill(175,210,155,ta); textStyle(NORMAL); textSize(height*0.022);
    text('Tutorial',width/2,height/2-height*0.06);
    textStyle(BOLD); textSize(height*0.058); fill(225,240,200,ta);
    text('Through the Trees',width/2,height/2);
    if (introTimer > INTRO_FADE_FRAMES + 20) {
      fill(150,185,130,ta*0.8); textStyle(NORMAL); textSize(height*0.020);
      text('use A / D to move    SPACE to jump',width/2,height/2+height*0.08);
    }
    textStyle(NORMAL);
  }
}

// ─────────────────────────────────────────────────────────
function drawLoseScreen() {
  drawBG(); drawFG();
  noStroke(); fill(10,18,10,195); rect(0,0,width,height);
  fill(28,38,24); stroke(80,110,60); strokeWeight(2);
  rectMode(CENTER); rect(width/2,height/2,min(width*0.5,560),210,10); rectMode(CORNER);
  stroke(60,90,45,140); strokeWeight(1); noFill();
  rectMode(CENTER); rect(width/2,height/2,min(width*0.5,560)-12,198,8); rectMode(CORNER);
  let cx=width/2, cy=height/2;
  noStroke(); fill(0,0,0,160);
  textAlign(CENTER,CENTER); textFont('Georgia'); textStyle(BOLD); textSize(height*0.052);
  text('lost in the forest',cx+2,cy-50+2);
  fill(195,215,165); text('lost in the forest',cx,cy-50);
  textStyle(NORMAL); textSize(height*0.022); fill(140,168,115);
  text('she never made it home.',cx,cy+2);
  textSize(height*0.018); fill(100,130,80);
  text('the cold crept in.',cx,cy+30);
  if (floor(frameCount/30)%2===0) { textSize(height*0.019); fill(160,190,130); text('press SPACE to try again',cx,cy+68); }
  textStyle(NORMAL);
}

// ─────────────────────────────────────────────────────────
function drawWinScreen() {
  drawBG(); drawFG();
  noStroke(); fill(245,230,210,200); rect(0,0,width,height);
  fill(255,248,235); stroke(180,140,90); strokeWeight(3);
  rectMode(CENTER); rect(width/2,height/2,min(width*0.5,580),200,12); rectMode(CORNER);
  noStroke();
  let cx=width/2,cy=height/2,cw=min(width*0.5,580)/2;
  for (let [px,py] of [[cx-cw+30,cy-75],[cx+cw-30,cy-75],[cx-cw+30,cy+75],[cx+cw-30,cy+75]]) {
    fill(240,160,180); ellipse(px,py,14,14); fill(255,220,80); ellipse(px,py,6,6);
  }
  fill(90,55,20); textAlign(CENTER,CENTER); textFont('Georgia'); textStyle(BOLD);
  textSize(height*0.055); text('You made it home!',width/2,height/2-28);
  textStyle(NORMAL); textSize(height*0.024); fill(120,80,40);
  text('She found her way through the forest.',width/2,height/2+22);
  if (floor(frameCount/30)%2===0) { textSize(height*0.020); fill(160,110,60); text('press SPACE to play again',width/2,height/2+60); }
drawNextLevelButton();
}

// ─────────────────────────────────────────────────────────
function keyPressed() {
  startAudioOnce();

  if (introTimer > 0 && !introFadeStarted) {
    introFadeStarted = true;
    introTimer = INTRO_FADE_FRAMES;
    return;
  }

  if (key===' ' && (gameWon||gameLost)) {
    gameWon=false; gameLost=false;
    worldX=0; flipped=false; flipTimer=0; flipIndex=0;
    introTimer=INTRO_DISPLAY_FRAMES + INTRO_FADE_FRAMES; introFadeStarted=false; countdown=0; countdownTimer=0;
    hp=MAX_HP; invTimer=0; levelTimer=0;
    velY=0; onGround=true;
    charX=width*0.25; charY=groundY();
    animals.forEach(a=>{a.wx=a.startWx;a.frame=0;a.ft=0;});
    if (sndMusic && sndMusic.isLoaded()) { sndMusic.stop(); sndMusic.loop(); }
  }
}

// Some browsers only count a mouse/touch interaction as the
// unlocking gesture, not a keypress — cover both.
function mousePressed() {
  startAudioOnce();

  if (showTitleScreen) {
    let inBtn = mouseX > startBtn.x && mouseX < startBtn.x + startBtn.w
             && mouseY > startBtn.y && mouseY < startBtn.y + startBtn.h;
    if (inBtn) showTitleScreen = false;
    return;
  }

  if (gameWon) {
    let inBtn = mouseX > nextLevelBtn.x && mouseX < nextLevelBtn.x + nextLevelBtn.w
             && mouseY > nextLevelBtn.y && mouseY < nextLevelBtn.y + nextLevelBtn.h;
    if (inBtn) {
      window.location.href = "level2.html"; // ← change to your actual level 2 page filename
    }
  }
}