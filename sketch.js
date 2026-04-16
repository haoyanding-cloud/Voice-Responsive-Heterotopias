let mic;
let imgFiles = ['dream1.jpg','dream3.jpg', 'dream4.jpg', 'dream5.jpg']; 
let imgs = [];
let currentImgIdx = 0;
let particles = [];
let resolution = 6; 

function preload() {
  for (let i = 0; i < imgFiles.length; i++) {
    imgs[i] = loadImage(imgFiles[i]);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  mic = new p5.AudioIn();
  mic.start();

  // 1. Initialize Particle Pool
  // Pre-create 30,000 particles to handle high-resolution image data
  // efficiently without constant memory reallocation.
  for (let i = 0; i < 30000; i++) {
    particles.push(new MemoryParticle());
  }

  // Initial call to set the first image target positions
  switchImage();
}

function draw() {
  // Low-alpha background creates the "Ink/Afterimage" trailing effect
  background(10, 10, 20, 35);
  
  let vol = mic.getLevel();
  let v = constrain(vol * 3, 0, 1); 

  // Visual feedback for loud sounds (Screen shake)
  let shake = v > 0.7 ? map(v, 0.7, 1, 2, 15) : 0;

  push();
  translate(random(-shake, shake), random(-shake, shake));
  for (let p of particles) {
    // Only update and render active fragments of the current memory
    if (p.active) {
      p.update(v);
      p.display(v);
    }
  }
  pop();

  // Automatic scene transition based on sustained sound volume
  if (vol > 0.5 && frameCount % 120 === 0) {
    currentImgIdx = (currentImgIdx + 1) % imgs.length;
    switchImage();
  }

  drawVHSOverlay(v);
}

function switchImage() {
  // Step 1: Deactivate all particles to clear the current scene
  for (let p of particles) {
    p.active = false;
  }

  let nextImg = imgs[currentImgIdx];
  if (!nextImg || nextImg.width === 0) return;

  nextImg.loadPixels();
  let startX = (width - nextImg.width) / 2;
  let startY = (height - nextImg.height) / 2;

  let particleIdx = 0;
  
  // Step 2: Map the new image pixels to the existing particle pool
  for (let x = 0; x < nextImg.width; x += resolution) {
    for (let y = 0; y < nextImg.height; y += resolution) {
      let i = (x + y * nextImg.width) * 4;
      if (i < nextImg.pixels.length) {
        let r = nextImg.pixels[i];
        let g = nextImg.pixels[i + 1];
        let b = nextImg.pixels[i + 2];
        let a = nextImg.pixels[i + 3];

        // Only assign particles to visible (non-transparent) pixels
        if (a > 128 && particleIdx < particles.length) {
          let p = particles[particleIdx];
          p.target.set(startX + x, startY + y);
          p.col = color(r, g, b, 220);
          p.active = true; // Activate this particle
          particleIdx++;
        }
      }
    }
  }
}

class MemoryParticle {
  constructor() {
    this.target = createVector(0, 0);
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().mult(random(2, 5));
    this.acc = createVector(0, 0);
    this.col = color(255);
    this.maxSpeed = 15;
    this.friction = 0.92;
    this.active = false; // Initial state set to inactive
  }

  update(v) {
    let desired = p5.Vector.sub(this.target, this.pos);
    let d = desired.mag();

    if (v > 0.05) {
      // Assemble State: Sound energy creates attraction towards the target
      let speed = this.maxSpeed;
      if (d < 100) speed = map(d, 0, 100, 0, this.maxSpeed);
      desired.setMag(speed);
      let steer = p5.Vector.sub(desired, this.vel);
      steer.mult(v * 0.8); 
      this.acc.add(steer);

      // Precise snapping using Linear Interpolation (Lerp)
      if (d < 2) {
        this.pos = p5.Vector.lerp(this.pos, this.target, 0.3);
        this.vel.mult(0.5);
      }
    } else {
      // Drift State: Particles wander randomly when silent (Subconscious state)
      let n = noise(this.pos.x * 0.01, this.pos.y * 0.01, frameCount * 0.01);
      let wander = p5.Vector.fromAngle(n * TWO_PI).mult(0.15);
      this.acc.add(wander);
    }

    this.vel.add(this.acc);
    this.vel.mult(this.friction);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  display(v) {
    noStroke();
    // High-volume overload effect: particles turn white
    if (v > 0.85) {
      fill(255, 255);
    } else {
      // Color brightening based on volume intensity
      let r = red(this.col) + v * 40;
      let g = green(this.col) + v * 40;
      let b = blue(this.col) + v * 40;
      fill(r, g, b, 200);
    }
    // Dynamic particle scaling
    let sizePlus = v * 6;
    rect(this.pos.x, this.pos.y, resolution - 1 + sizePlus, resolution - 1 + sizePlus);
  }
}

function mousePressed() {
  currentImgIdx = (currentImgIdx + 1) % imgs.length;
  switchImage();
}

function drawVHSOverlay(v) {
  stroke(255, 12);
  strokeWeight(1);
  for (let i = 0; i < height; i += 6) {
    line(0, i, width, i);
  }
  // Randomized signal noise
  if (v > 0.7 && random() > 0.9) {
    stroke(255, 80);
    line(0, random(height), width, random(height));
  }
  
  // VHS aesthetic UI elements
  fill(255, 160);
  noStroke();
  textSize(18);
  textFont('Courier New');
  text("PLAY ▶", 50, height - 50);
  
  // Flashing recording dot
  if (frameCount % 60 < 30) {
    fill(255, 0, 0, 180);
    ellipse(width - 110, 44, 12, 12);
    fill(255, 180);
    text("REC", width - 90, 50);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}