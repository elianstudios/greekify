/* ============================================================
   GREEKIFY — selfie slot machine. No backend. No shame.
   ============================================================ */

// ---------- REEL DATA ----------
// Each item: { id, emoji, label, draw(ctx, w, h, faceBox) }
// faceBox is a rough rectangle where the face is, so overlays land nicely.

const MOUSTACHES = [
  {
    id: "handlebar", emoji: "👨🏻‍🦰", label: "Handlebar",
    draw(ctx, w, h, f) {
      ctx.save();
      ctx.translate(f.cx, f.cy + f.r * 0.35);
      ctx.fillStyle = "#231a13";
      ctx.beginPath();
      ctx.moveTo(-f.r * 0.55, 0);
      ctx.bezierCurveTo(-f.r * 0.6, -f.r * 0.25, -f.r * 0.2, -f.r * 0.05, 0, 0);
      ctx.bezierCurveTo(f.r * 0.2, -f.r * 0.05, f.r * 0.6, -f.r * 0.25, f.r * 0.55, 0);
      ctx.bezierCurveTo(f.r * 0.5, f.r * 0.12, f.r * 0.2, f.r * 0.08, 0, f.r * 0.06);
      ctx.bezierCurveTo(-f.r * 0.2, f.r * 0.08, -f.r * 0.5, f.r * 0.12, -f.r * 0.55, 0);
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "chevron", emoji: "🥸", label: "Big Chevron",
    draw(ctx, w, h, f) {
      ctx.save();
      ctx.translate(f.cx, f.cy + f.r * 0.4);
      ctx.fillStyle = "#1c140d";
      ctx.beginPath();
      ctx.ellipse(0, 0, f.r * 0.7, f.r * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "papou", emoji: "👴", label: "Παππού",
    draw(ctx, w, h, f) {
      ctx.save();
      ctx.translate(f.cx, f.cy + f.r * 0.32);
      ctx.fillStyle = "#cfcfcf";
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(i * f.r * 0.4, -f.r * 0.1, i * f.r * 0.7, f.r * 0.15);
        ctx.quadraticCurveTo(i * f.r * 0.4, f.r * 0.05, 0, f.r * 0.04);
        ctx.fill();
      }
      ctx.restore();
    },
  },
  {
    id: "pencil", emoji: "💁🏻‍♂️", label: "Pencil",
    draw(ctx, w, h, f) {
      ctx.save();
      ctx.translate(f.cx, f.cy + f.r * 0.36);
      ctx.fillStyle = "#161009";
      ctx.fillRect(-f.r * 0.45, -f.r * 0.025, f.r * 0.9, f.r * 0.05);
      ctx.restore();
    },
  },
  {
    id: "zorba", emoji: "🕺", label: "Zorba",
    draw(ctx, w, h, f) {
      ctx.save();
      ctx.translate(f.cx, f.cy + f.r * 0.34);
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.moveTo(-f.r * 0.62, -f.r * 0.05);
      ctx.quadraticCurveTo(-f.r * 0.78, -f.r * 0.35, -f.r * 0.45, -f.r * 0.45);
      ctx.quadraticCurveTo(-f.r * 0.2, -f.r * 0.3, 0, -f.r * 0.05);
      ctx.quadraticCurveTo(f.r * 0.2, -f.r * 0.3, f.r * 0.45, -f.r * 0.45);
      ctx.quadraticCurveTo(f.r * 0.78, -f.r * 0.35, f.r * 0.62, -f.r * 0.05);
      ctx.quadraticCurveTo(f.r * 0.3, f.r * 0.15, 0, f.r * 0.08);
      ctx.quadraticCurveTo(-f.r * 0.3, f.r * 0.15, -f.r * 0.62, -f.r * 0.05);
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "none", emoji: "🚫", label: "Clean Shaven (boring)",
    draw() { /* nothing */ },
  },
];

const SCENES = [
  {
    id: "acropolis", emoji: "🏛️", label: "Acropolis at noon",
    draw(ctx, w, h) {
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#9fd6ff");
      sky.addColorStop(1, "#f7d046");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      // sun
      ctx.fillStyle = "#fffbe0";
      ctx.beginPath(); ctx.arc(w * 0.78, h * 0.22, w * 0.08, 0, Math.PI * 2); ctx.fill();
      // hill
      ctx.fillStyle = "#c2a86b";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.72);
      ctx.quadraticCurveTo(w * 0.5, h * 0.55, w, h * 0.74);
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      // parthenon
      const px = w * 0.32, py = h * 0.55, pw = w * 0.36, ph = h * 0.18;
      ctx.fillStyle = "#efe6c8";
      ctx.fillRect(px, py + ph * 0.85, pw, ph * 0.15); // base
      ctx.fillRect(px + pw * 0.04, py + ph * 0.18, pw * 0.92, ph * 0.7);
      // columns
      ctx.fillStyle = "#d8cda8";
      const cols = 8;
      for (let i = 0; i < cols; i++) {
        const cx = px + pw * 0.06 + (i * (pw * 0.88) / (cols - 1));
        ctx.fillRect(cx - pw * 0.018, py + ph * 0.2, pw * 0.036, ph * 0.65);
      }
      // pediment
      ctx.fillStyle = "#efe6c8";
      ctx.beginPath();
      ctx.moveTo(px, py + ph * 0.2);
      ctx.lineTo(px + pw / 2, py);
      ctx.lineTo(px + pw, py + ph * 0.2);
      ctx.closePath(); ctx.fill();
    },
  },
  {
    id: "taverna", emoji: "🍽️", label: "Taverna at dusk",
    draw(ctx, w, h) {
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      sky.addColorStop(0, "#ff9966"); sky.addColorStop(1, "#ffd5a8");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.6);
      ctx.fillStyle = "#5a3a1f"; ctx.fillRect(0, h * 0.6, w, h * 0.4);
      // checkered tablecloth foreground
      const sq = w / 16;
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#c4292b" : "#f4ecd8";
          ctx.fillRect(x * sq, h - (6 - y) * sq, sq, sq);
        }
      }
      // hanging string lights
      ctx.strokeStyle = "#222"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.1);
      ctx.quadraticCurveTo(w / 2, h * 0.22, w, h * 0.1);
      ctx.stroke();
      for (let i = 1; i < 10; i++) {
        const t = i / 10;
        const x = t * w;
        const y = h * 0.1 + Math.sin(t * Math.PI) * h * 0.06;
        ctx.fillStyle = ["#ffd54f", "#ff8a65", "#ffe082"][i % 3];
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
    },
  },
  {
    id: "kafenio", emoji: "☕", label: "Kafeneio (old men staring)",
    draw(ctx, w, h) {
      ctx.fillStyle = "#e8dcb6"; ctx.fillRect(0, 0, w, h);
      // wall stripe
      ctx.fillStyle = "#0d5eaf"; ctx.fillRect(0, h * 0.55, w, h * 0.05);
      // floor
      ctx.fillStyle = "#9a7445"; ctx.fillRect(0, h * 0.78, w, h * 0.22);
      // chairs (rough)
      ctx.fillStyle = "#3a2517";
      for (let i = 0; i < 5; i++) {
        const cx = (i + 0.5) * (w / 5);
        ctx.fillRect(cx - 14, h * 0.65, 28, 40);
        ctx.fillRect(cx - 14, h * 0.62, 28, 6);
      }
      // suspicious eyes
      for (let i = 0; i < 4; i++) {
        const cx = (i + 0.5) * (w / 4);
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(cx - 6, h * 0.5, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 6, h * 0.5, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(cx - 6, h * 0.5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 6, h * 0.5, 2, 0, Math.PI * 2); ctx.fill();
      }
    },
  },
  {
    id: "mykonos", emoji: "🏖️", label: "Mykonos beach club",
    draw(ctx, w, h) {
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      sky.addColorStop(0, "#43c1f5"); sky.addColorStop(1, "#a6e7ff");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.5);
      // sea
      const sea = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.75);
      sea.addColorStop(0, "#0d5eaf"); sea.addColorStop(1, "#1670c4");
      ctx.fillStyle = sea; ctx.fillRect(0, h * 0.5, w, h * 0.25);
      // sand
      ctx.fillStyle = "#f3e3b8"; ctx.fillRect(0, h * 0.75, w, h * 0.25);
      // white cube houses
      ctx.fillStyle = "#fff";
      ctx.fillRect(w * 0.08, h * 0.4, w * 0.12, h * 0.12);
      ctx.fillRect(w * 0.18, h * 0.36, w * 0.1, h * 0.16);
      // blue dome
      ctx.fillStyle = "#0d5eaf";
      ctx.beginPath(); ctx.arc(w * 0.23, h * 0.36, w * 0.04, Math.PI, 0); ctx.fill();
      // umbrella
      ctx.fillStyle = "#c4292b";
      ctx.beginPath();
      ctx.moveTo(w * 0.75, h * 0.72);
      ctx.quadraticCurveTo(w * 0.85, h * 0.55, w * 0.95, h * 0.72);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#222"; ctx.fillRect(w * 0.849, h * 0.72, 3, h * 0.12);
    },
  },
  {
    id: "village", emoji: "🐈", label: "Village square (cats everywhere)",
    draw(ctx, w, h) {
      ctx.fillStyle = "#e9d8a8"; ctx.fillRect(0, 0, w, h * 0.6);
      ctx.fillStyle = "#a37642"; ctx.fillRect(0, h * 0.6, w, h * 0.4);
      // tiled roof line
      ctx.fillStyle = "#c4582b";
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.arc(i * (w / 14) + w / 28, h * 0.6, w / 28, Math.PI, 0);
        ctx.fill();
      }
      // 7 cats in random positions
      const rng = mulberry32(7);
      for (let i = 0; i < 7; i++) {
        const cx = rng() * w;
        const cy = h * 0.7 + rng() * h * 0.25;
        const s = 0.6 + rng() * 0.7;
        drawCat(ctx, cx, cy, s);
      }
    },
  },
  {
    id: "ferry", emoji: "⛴️", label: "On the wrong ferry",
    draw(ctx, w, h) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#a4d8f0"); sky.addColorStop(0.55, "#0d5eaf"); sky.addColorStop(1, "#073d75");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      // waves
      ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const y = h * 0.6 + i * 14;
        ctx.beginPath();
        for (let x = 0; x < w; x += 12) {
          const yy = y + Math.sin((x + i * 30) * 0.05) * 4;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      // ferry silhouette
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.moveTo(w * 0.55, h * 0.7);
      ctx.lineTo(w * 0.95, h * 0.7);
      ctx.lineTo(w * 0.9, h * 0.78);
      ctx.lineTo(w * 0.6, h * 0.78);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(w * 0.63, h * 0.62, w * 0.25, h * 0.08);
    },
  },
];

const PROPS = [
  {
    id: "komboloi", emoji: "📿", label: "Komboloi (worry beads)",
    draw(ctx, w, h, f) {
      ctx.save();
      ctx.translate(f.cx + f.r * 1.1, f.cy + f.r * 0.4);
      ctx.rotate(0.5);
      const beads = ["#c4292b", "#0d5eaf", "#d4a017"];
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = beads[i % 3];
        ctx.beginPath();
        ctx.arc(0, i * 18, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#3a2517"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 8 * 18); ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "mati", emoji: "🧿", label: "Evil eye (μάτι)",
    draw(ctx, w, h, f) {
      ctx.save();
      ctx.translate(f.cx + f.r * 0.95, f.cy - f.r * 0.6);
      // outer ring
      ctx.fillStyle = "#0d5eaf";
      ctx.beginPath(); ctx.arc(0, 0, f.r * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0, 0, f.r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#43c1f5";
      ctx.beginPath(); ctx.arc(0, 0, f.r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath(); ctx.arc(0, 0, f.r * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "ouzo", emoji: "🥃", label: "Ouzo glass",
    draw(ctx, w, h, f) {
      ctx.save();
      ctx.translate(f.cx - f.r * 1.15, f.cy + f.r * 0.6);
      // glass
      ctx.fillStyle = "rgba(244,236,216,0.85)";
      ctx.strokeStyle = "#222"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, -30); ctx.lineTo(18, -30);
      ctx.lineTo(14, 30); ctx.lineTo(-14, 30); ctx.closePath();
      ctx.fill(); ctx.stroke();
      // milky liquid
      ctx.fillStyle = "#f6f3e8";
      ctx.beginPath();
      ctx.moveTo(-16, -15); ctx.lineTo(16, -15);
      ctx.lineTo(13, 28); ctx.lineTo(-13, 28); ctx.closePath(); ctx.fill();
      // ice cube
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(-6, -10, 10, 10);
      ctx.restore();
    },
  },
  {
    id: "plate", emoji: "🍽️", label: "Plate (mid-smash)",
    draw(ctx, w, h, f) {
      ctx.save();
      ctx.translate(f.cx - f.r * 0.2, f.cy - f.r * 1.05);
      ctx.rotate(-0.3);
      // shards
      const shards = [
        [[-30, 0], [-6, -12], [-2, 8]],
        [[-2, 8], [-6, -12], [10, -10], [14, 6]],
        [[14, 6], [10, -10], [28, -2], [30, 10]],
      ];
      for (const s of shards) {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#0d5eaf"; ctx.lineWidth = 2;
        ctx.beginPath();
        s.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      // motion lines
      ctx.strokeStyle = "#222"; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-40 - i * 8, 16 + i * 5);
        ctx.lineTo(-25 - i * 8, 10 + i * 5);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    id: "flag", emoji: "🇬🇷", label: "Greek flag cape",
    draw(ctx, w, h, f) {
      ctx.save();
      ctx.translate(f.cx, f.cy + f.r * 1.0);
      const fw = f.r * 3.2, fh = f.r * 1.6;
      // stripes
      const stripeH = fh / 9;
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = i % 2 ? "#fff" : "#0d5eaf";
        ctx.fillRect(-fw / 2, i * stripeH, fw, stripeH);
      }
      // canton
      ctx.fillStyle = "#0d5eaf";
      ctx.fillRect(-fw / 2, 0, stripeH * 5, stripeH * 5);
      // cross
      ctx.fillStyle = "#fff";
      ctx.fillRect(-fw / 2 + stripeH * 2, 0, stripeH, stripeH * 5);
      ctx.fillRect(-fw / 2, stripeH * 2, stripeH * 5, stripeH);
      ctx.restore();
    },
  },
  {
    id: "frappe", emoji: "🥤", label: "Frappé (3 hours old)",
    draw(ctx, w, h, f) {
      ctx.save();
      ctx.translate(f.cx + f.r * 1.1, f.cy + f.r * 0.85);
      // glass
      ctx.fillStyle = "rgba(244,236,216,0.4)";
      ctx.strokeStyle = "#222"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-22, -40); ctx.lineTo(22, -40);
      ctx.lineTo(18, 38); ctx.lineTo(-18, 38); ctx.closePath();
      ctx.fill(); ctx.stroke();
      // coffee
      ctx.fillStyle = "#6b3a16";
      ctx.beginPath();
      ctx.moveTo(-20, -10); ctx.lineTo(20, -10);
      ctx.lineTo(17, 36); ctx.lineTo(-17, 36); ctx.closePath(); ctx.fill();
      // foam
      ctx.fillStyle = "#e6caa3";
      ctx.fillRect(-21, -16, 42, 7);
      // straw
      ctx.fillStyle = "#c4292b";
      ctx.fillRect(8, -55, 4, 30);
      ctx.restore();
    },
  },
];

// helper: deterministic rng for the village cats
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = seed;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function drawCat(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = ["#222", "#d4a017", "#fff", "#7a5a3a"][Math.floor(Math.random() * 4)];
  // body
  ctx.beginPath(); ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.beginPath(); ctx.arc(-18, -4, 8, 0, Math.PI * 2); ctx.fill();
  // ears
  ctx.beginPath(); ctx.moveTo(-22, -10); ctx.lineTo(-18, -16); ctx.lineTo(-15, -10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-17, -10); ctx.lineTo(-13, -15); ctx.lineTo(-10, -9); ctx.closePath(); ctx.fill();
  // tail
  ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(16, -1); ctx.quadraticCurveTo(28, -10, 22, -18); ctx.stroke();
  ctx.restore();
}

// ---------- STATE ----------
const state = {
  img: null,          // HTMLImageElement of the user's face
  imgEl: null,
  spinning: false,
  pick: { moustache: null, scene: null, prop: null },
  webcamStream: null,
};

// ---------- DOM ----------
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const webcamBtn = document.getElementById("webcamBtn");
const webcamEl = document.getElementById("webcam");
const snapBtn = document.getElementById("snapBtn");
const hint = document.getElementById("hint");

const reelEls = [...document.querySelectorAll(".reel")];
const lever = document.getElementById("lever");
const readoutValue = document.getElementById("readoutValue");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const polaroid = document.getElementById("polaroid");
const caption = document.getElementById("caption");
const saveBtn = document.getElementById("saveBtn");
const spinAgainBtn = document.getElementById("spinAgainBtn");

// ---------- INITIAL: fill the reels with their pools ----------
function fillReelStrip(reelEl, pool) {
  const strip = reelEl.querySelector("[data-strip]");
  // we duplicate the pool a few times so spinning looks continuous
  strip.innerHTML = "";
  const repeats = 6;
  for (let r = 0; r < repeats; r++) {
    for (const item of pool) {
      const li = document.createElement("li");
      li.innerHTML = `<div><span class="emj">${item.emoji}</span><span class="lbl">${item.label}</span></div>`;
      strip.appendChild(li);
    }
  }
}
fillReelStrip(reelEls[0], MOUSTACHES);
fillReelStrip(reelEls[1], SCENES);
fillReelStrip(reelEls[2], PROPS);

// ---------- IMAGE INPUT ----------
function setImage(src) {
  const img = new Image();
  img.onload = () => {
    state.img = img;
    drawComposite(); // shows just the face, no overlays yet
    polaroid.classList.add("ready");
    if (state.pick.moustache) {
      // already had picks — re-draw with them
      drawComposite();
    } else {
      // first time: show face only
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawFaceOnly();
    }
    dropzone.classList.add("has-image");
    stopWebcam();
    hint.textContent = "Looking good. Now pull the lever. 👉";
  };
  img.src = src;
}

function drawFaceOnly() {
  fitImage(ctx, state.img, canvas.width, canvas.height);
}

function fitImage(ctx, img, w, h) {
  // cover fit
  const ir = img.width / img.height;
  const cr = w / h;
  let dw, dh;
  if (ir > cr) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

dropzone.addEventListener("click", (e) => {
  if (e.target === snapBtn || e.target.closest("button,label")) return;
  if (!state.webcamStream) fileInput.click();
});
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("drag"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault(); dropzone.classList.remove("drag");
  const file = e.dataTransfer.files?.[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }
});
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }
});

// ---------- WEBCAM ----------
webcamBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    state.webcamStream = stream;
    webcamEl.srcObject = stream;
    dropzone.classList.add("webcam-on");
  } catch (err) {
    hint.textContent = "Webcam denied. Drop a file instead.";
  }
});
snapBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const tmp = document.createElement("canvas");
  tmp.width = webcamEl.videoWidth; tmp.height = webcamEl.videoHeight;
  const tctx = tmp.getContext("2d");
  // mirror to match the on-screen preview
  tctx.translate(tmp.width, 0); tctx.scale(-1, 1);
  tctx.drawImage(webcamEl, 0, 0);
  setImage(tmp.toDataURL("image/png"));
});
function stopWebcam() {
  if (!state.webcamStream) return;
  state.webcamStream.getTracks().forEach(t => t.stop());
  state.webcamStream = null;
  dropzone.classList.remove("webcam-on");
}

// ---------- THE SPIN ----------
const REEL_ITEM_H = 96;
const REEL_POOLS = [MOUSTACHES, SCENES, PROPS];

function pickIndex(pool) {
  return Math.floor(Math.random() * pool.length);
}

function spinReel(reelEl, pool, finalIndex, durationMs, onDone) {
  const strip = reelEl.querySelector("[data-strip]");
  const repeats = 6;
  const poolLen = pool.length;
  // final position lands on the "middle" repeat block to leave room above/below
  const blockStart = Math.floor(repeats / 2) * poolLen;
  const finalOffset = (blockStart + finalIndex) * REEL_ITEM_H;
  // start: scrolled up to top
  strip.style.transition = "none";
  strip.style.transform = `translateY(0px)`;

  // animate via JS so it can be eased and feel slot-y
  const start = performance.now();
  const startOffset = 0;
  // overshoot then settle
  const overshoot = finalOffset + 26;
  reelEl.classList.add("spinning");

  function frame(now) {
    const t = Math.min(1, (now - start) / durationMs);
    // easeOutQuart
    const e = 1 - Math.pow(1 - t, 4);
    let y;
    if (t < 0.92) {
      y = startOffset + e * overshoot;
    } else {
      // settle from overshoot back to finalOffset
      const k = (t - 0.92) / 0.08;
      y = overshoot - k * 26;
    }
    strip.style.transform = `translateY(${-y}px)`;
    if (t < 1) requestAnimationFrame(frame);
    else {
      strip.style.transform = `translateY(${-finalOffset}px)`;
      reelEl.classList.remove("spinning");
      onDone?.();
    }
  }
  requestAnimationFrame(frame);
}

lever.addEventListener("click", () => {
  if (state.spinning) return;
  if (!state.img) {
    hint.textContent = "Drop a selfie first. The reels need a face to disrespect.";
    dropzone.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }],
      { duration: 240 }
    );
    return;
  }
  state.spinning = true;
  saveBtn.disabled = true;
  spinAgainBtn.disabled = true;
  lever.classList.add("pulled");
  setTimeout(() => lever.classList.remove("pulled"), 480);
  readoutValue.textContent = "spinning…";

  // pick finals
  const finals = REEL_POOLS.map(pickIndex);
  const picks = finals.map((i, k) => REEL_POOLS[k][i]);

  let done = 0;
  const durations = [1500, 2200, 2900]; // staggered stops
  REEL_POOLS.forEach((pool, k) => {
    spinReel(reelEls[k], pool, finals[k], durations[k], () => {
      done++;
      if (done === 3) {
        state.pick = { moustache: picks[0], scene: picks[1], prop: picks[2] };
        drawComposite();
        state.spinning = false;
        saveBtn.disabled = false;
        spinAgainBtn.disabled = false;
        readoutValue.textContent = composeCaption(picks);
        caption.textContent = "“" + composeCaption(picks) + "”";
      }
    });
  });
});

spinAgainBtn.addEventListener("click", () => lever.click());

// ---------- CAPTION GENERATOR ----------
function composeCaption(picks) {
  const [m, s, p] = picks;
  const templates = [
    `${m.label} energy at the ${s.label.toLowerCase()}, with a ${p.label.toLowerCase()}.`,
    `Caught in ${s.label.toLowerCase()} — sporting ${m.label.toLowerCase()}, clutching ${p.label.toLowerCase()}.`,
    `${m.label}. ${s.label}. ${p.label}. Yiayia would weep.`,
    `Local legend: ${m.label.toLowerCase()} at ${s.label.toLowerCase()}, never without their ${p.label.toLowerCase()}.`,
    `Greek-coded: ${m.label.toLowerCase()} + ${s.label.toLowerCase()} + ${p.label.toLowerCase()}.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// ---------- COMPOSITE DRAW ----------
function detectFaceBox() {
  // we don't actually detect — we assume centered face occupying middle ~60%
  return {
    cx: canvas.width / 2,
    cy: canvas.height * 0.46,
    r: canvas.width * 0.22, // radius-ish
  };
}

function drawComposite() {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // 1. scene (background) — if picked
  if (state.pick.scene) {
    state.pick.scene.draw(ctx, w, h);
  } else {
    ctx.fillStyle = "#f4ecd8"; ctx.fillRect(0, 0, w, h);
  }

  // 2. user image, cropped to a soft circle so it sits in the scene
  if (state.img) {
    ctx.save();
    const f = detectFaceBox();
    ctx.beginPath();
    ctx.arc(f.cx, f.cy, f.r * 1.5, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    fitImage(ctx, state.img, w, h);
    ctx.restore();
    // soft vignette around the face cutout
    const grad = ctx.createRadialGradient(f.cx, f.cy, f.r * 1.2, f.cx, f.cy, f.r * 1.7);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(f.cx, f.cy, f.r * 1.7, 0, Math.PI * 2); ctx.fill();
  }

  // 3. moustache on top of face
  if (state.pick.moustache && state.img) {
    state.pick.moustache.draw(ctx, w, h, detectFaceBox());
  }

  // 4. prop on top of everything
  if (state.pick.prop && state.img) {
    state.pick.prop.draw(ctx, w, h, detectFaceBox());
  }

  // 5. tourist t-shirt watermark
  ctx.save();
  ctx.font = "bold 22px 'Cinzel', serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.strokeStyle = "rgba(13,94,175,0.9)";
  ctx.lineWidth = 4;
  ctx.textAlign = "right";
  ctx.strokeText("GREEKIFY ☀", w - 14, h - 18);
  ctx.fillText("GREEKIFY ☀", w - 14, h - 18);
  ctx.restore();
}

// ---------- SAVE ----------
saveBtn.addEventListener("click", () => {
  if (!state.pick.moustache) return;
  const a = document.createElement("a");
  a.download = "greekify.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
});

// ---------- placeholder canvas tint ----------
(function placeholder() {
  ctx.fillStyle = "#f4ecd8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
})();
