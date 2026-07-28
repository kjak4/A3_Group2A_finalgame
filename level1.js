// ─────────────────────────────────────────────────────────
//  THROUGH THE TREES — Tutorial Level
// ─────────────────────────────────────────────────────────

let imgSky, imgBgTrees, imgBushes, imgGround, imgFgTrees;
let imgSprites, imgLog, imgRock, imgRacoon, imgRabbit;
let imgSign, imgPlatform, imgPlatform2, imgSpikes, imgFinishSign;

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
  imgBgTrees   = loadImage('assets/images/Asset 11.png');
  imgBushes    = loadImage('assets/images/Asset 9.png');
  imgGround    = loadImage('assets/images/Asset 10.png');
  imgFgTrees   = loadImage('assets/images/Asset 8.png');
  imgSprites   = loadImage('assets/images/sprites2.png');
  imgLog       = loadImage('assets/images/log.png');
  imgRock      = loadImage('assets/images/rock.png');
  imgRacoon    = loadImage('assets/images/racoon.png');
  imgRabbit    = loadImage('assets/images/rabbit.png');
  imgSign      = loadImage('assets/images/sign.png');
  imgPlatform  = loadImage('assets/images/platform.png');
  imgPlatform2 = loadImage('assets/images/platform2.png');
  imgSpikes    = loadImage('assets/images/spikes.png');
  imgFinishSign= loadImage('assets/images/youmadeit.png');

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

  if (worldX >= LEVEL_END) {
    gameWon=true;
    if (sndWin && sndWin.isLoaded()) sndWin.play();
    if (sndMusic && sndMusic.isLoaded()) sndMusic.stop(); sndMusic.setVolume(0.01);
    return;
  }
  levelTimer++;
  if (levelTimer >= TIME_LIMIT) { gameLost=true; if (sndMusic && sndMusic.isLoaded()) sndMusic.stop(); sndMusic.setVolume(0.01);return; }
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
  let progress = levelTimer / TIME_LIMIT;

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

  noStroke(); fill(14,9,6);
  rect(psx, gy, pitW, height-gy);
  fill(38,22,10);
  rect(psx-6, gy, 10, height*0.14);
  rect(pex-4, gy, 10, height*0.14);

  if (imgSpikes) {
    let srcW=1188, srcH=831;
    let spikeH=height*0.18, spikeW=spikeH*(srcW/srcH);
    let n=ceil(pitW/spikeW)+1;
    imageMode(CORNER);
    for (let i=0;i<n;i++) {
      let dx=psx+i*spikeW;
      if (dx>pex) break;
      image(imgSpikes,dx,gy,spikeW,spikeH,165,168,srcW,srcH);
    }
  }

  noStroke(); fill(155,115,45,180);
  textAlign(CENTER,CENTER); textFont('monospace'); textStyle(BOLD);
  textSize(height*0.020);
  text('!', psx-25, groundY()-height*0.06);
  text('!', psx-48, groundY()-height*0.06);
  textStyle(NORMAL);
}

// ─────────────────────────────────────────────────────────
function drawPlatforms() {
  let srcX2=3, srcY2=148, srcW2=148, srcH2=229;
  imageMode(CORNER);
  for (let p of PLATFORMS) {
    let sx=toScreen(p.wx);
    let py=platY(p);
    if (sx < -PLAT_W-20 || sx > width+20) continue;
    let ih=groundY()-py+PLAT_H;
    image(imgPlatform2, sx, py, PLAT_W, ih, srcX2, srcY2, srcW2, srcH2);
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
  let sx=toScreen(LEVEL_END-150), gy=groundY();
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
  fill(190,215,160); textFont('monospace'); textStyle(BOLD); textSize(height*0.016);
  textAlign(RIGHT,TOP); text('TIME',width-pad,by+barH+3); textStyle(NORMAL);

  let progress=levelTimer/TIME_LIMIT;
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
  let reason=levelTimer>=TIME_LIMIT?'the forest swallowed the last of the light.':'the cold crept in.';
  text(reason,cx,cy+30);
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
}