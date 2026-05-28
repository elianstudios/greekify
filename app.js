/* ============================================================
   GREEKIFY — selfie slot machine. No backend. No shame.
   ============================================================ */

/* ============================================================
   WEBGL SHADER ENGINE — animated scene backgrounds
   ============================================================ */
const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// shared GLSL helpers, prepended to each fragment shader
const FRAG_PRELUDE = `
precision highp float;
varying vec2 v_uv;
uniform float u_t;     // time in seconds
uniform vec2  u_res;   // canvas px size
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i), b = hash(i + vec2(1,0)), c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
`;

// per-scene fragment shaders. uv: 0..1, origin top-left
const SHADERS = {
  acropolis: `
    void main() {
      vec2 uv = v_uv;
      // sky gradient w/ subtle drifting clouds
      vec3 sky = mix(vec3(0.62,0.84,1.0), vec3(0.97,0.82,0.27), pow(uv.y, 1.3));
      float clouds = fbm(vec2(uv.x*3.0 + u_t*0.04, uv.y*5.0));
      clouds = smoothstep(0.55, 0.78, clouds) * (1.0 - smoothstep(0.45, 0.62, uv.y));
      sky = mix(sky, vec3(1.0), clouds * 0.55);
      // sun w/ lens flare
      vec2 sunPos = vec2(0.78, 0.22);
      float d = distance(uv, sunPos);
      vec3 sun = vec3(1.0,0.98,0.85) * smoothstep(0.18, 0.0, d);
      sun += vec3(1.0,0.85,0.4) * (1.0 - smoothstep(0.0, 0.5, d)) * 0.25;
      sky += sun;
      // hill — wavy silhouette w/ heat shimmer
      float hillY = 0.72 - 0.12 * (sin(uv.x*3.14159) - 0.3);
      float shimmer = sin(uv.y*200.0 + u_t*3.0)*0.002 * smoothstep(0.6, 0.72, uv.y);
      float hillMask = step(hillY, uv.y + shimmer);
      vec3 hill = mix(vec3(0.76,0.66,0.42), vec3(0.55,0.45,0.28), uv.y);
      // marble parthenon
      vec2 pUV = (uv - vec2(0.32, 0.55)) / vec2(0.36, 0.18);
      float pInside = step(0.0, pUV.x) * step(pUV.x, 1.0) * step(0.18, pUV.y) * step(pUV.y, 1.0);
      vec3 marble = vec3(0.94,0.9,0.78) + fbm(pUV*12.0)*0.06;
      // columns
      float cols = step(0.5, fract(pUV.x*8.0));
      float colMask = pInside * step(0.2, pUV.y) * step(pUV.y, 0.85) * cols;
      marble = mix(marble*0.85, marble, cols);
      // pediment triangle
      float ped = pInside * step(pUV.y, 0.2) * step(abs(pUV.x-0.5), 0.5 * (pUV.y/0.2));
      vec3 col = mix(sky, hill, hillMask);
      col = mix(col, marble, pInside * (1.0 - hillMask*0.3));
      col = mix(col, marble*1.05, ped);
      gl_FragColor = vec4(col, 1.0);
    }`,
  taverna: `
    void main() {
      vec2 uv = v_uv;
      // dusk sky
      vec3 sky = mix(vec3(1.0,0.6,0.4), vec3(1.0,0.84,0.66), pow(1.0-uv.y, 1.3));
      sky = mix(sky, vec3(0.35,0.22,0.12), smoothstep(0.55, 0.65, uv.y));
      // sun on horizon
      float sun = smoothstep(0.06, 0.0, distance(uv, vec2(0.5, 0.58)));
      sky += vec3(1.0,0.7,0.4) * sun * 0.7;
      // string lights — curve y = 0.18 + sag*sin
      float lightCurve = 0.14 + 0.07 * sin(uv.x * 3.14159);
      // 10 bulbs
      float bulbs = 0.0;
      for (int i = 0; i < 10; i++) {
        float fi = (float(i)+0.5)/10.0;
        vec2 bp = vec2(fi, 0.14 + 0.07*sin(fi*3.14159));
        float d = distance(uv*vec2(u_res.x/u_res.y, 1.0), bp*vec2(u_res.x/u_res.y, 1.0));
        float flick = 0.85 + 0.15 * sin(u_t * (2.0 + fi*4.0) + fi*30.0);
        bulbs += smoothstep(0.012, 0.0, d) * flick * 1.2;
        bulbs += smoothstep(0.06, 0.0, d) * flick * 0.25;
      }
      // wire
      float wire = smoothstep(0.003, 0.0, abs(uv.y - lightCurve));
      // checkered tablecloth (bottom 25%)
      vec2 tc = floor(uv * vec2(16.0, 9.0));
      float checker = mod(tc.x + tc.y, 2.0);
      vec3 cloth = mix(vec3(0.96,0.93,0.85), vec3(0.77,0.16,0.17), checker);
      float clothMask = step(0.75, uv.y);
      vec3 col = sky;
      col = mix(col, cloth, clothMask);
      col += vec3(1.0,0.85,0.4) * bulbs;
      col = mix(col, vec3(0.1), wire * 0.7);
      gl_FragColor = vec4(col, 1.0);
    }`,
  kafenio: `
    void main() {
      vec2 uv = v_uv;
      // warm beige wall
      vec3 wall = vec3(0.91,0.86,0.71) - fbm(uv*8.0)*0.05;
      // greek-blue stripe
      float stripe = step(0.55, uv.y) * step(uv.y, 0.6);
      // wood floor below 0.78
      float floorMask = step(0.78, uv.y);
      vec3 floorCol = vec3(0.6,0.45,0.27) + fbm(vec2(uv.x*20.0, uv.y*60.0))*0.1;
      // cigarette smoke drifting up
      vec2 sUV = uv * vec2(1.0, 2.0) + vec2(u_t*0.02, -u_t*0.05);
      float smoke = fbm(sUV*2.0) * (1.0 - smoothstep(0.3, 0.7, uv.y));
      smoke *= smoothstep(0.0, 0.3, uv.y);
      // 4 pairs of suspicious eyes that blink
      float eyes = 0.0;
      for (int i = 0; i < 4; i++) {
        float fi = (float(i)+0.5)/4.0;
        float blink = step(0.05, fract(u_t*0.3 + fi*1.7));
        vec2 e1 = vec2(fi - 0.015, 0.5);
        vec2 e2 = vec2(fi + 0.015, 0.5);
        eyes += smoothstep(0.008, 0.0, distance(uv, e1)) * blink;
        eyes += smoothstep(0.008, 0.0, distance(uv, e2)) * blink;
      }
      vec3 col = wall;
      col = mix(col, vec3(0.05,0.37,0.69), stripe);
      col = mix(col, floorCol, floorMask);
      col = mix(col, vec3(0.95), smoke * 0.55);
      col = mix(col, vec3(0.0), eyes);
      gl_FragColor = vec4(col, 1.0);
    }`,
  // ===== ATMOSPHERIC OVERLAYS (transparent, layer over photo) =====
  acropolis_overlay: `
    void main() {
      vec2 uv = v_uv;
      vec3 col = vec3(0.0); float a = 0.0;
      // god rays from top
      vec2 sun = vec2(0.78, 0.12);
      vec2 d = uv - sun;
      float ang = atan(d.y, d.x);
      float rays = pow(0.5 + 0.5*sin(ang*14.0 + u_t*0.2), 16.0) * (1.0-smoothstep(0.0,0.8,length(d))) * 0.55;
      col += vec3(1.0,0.92,0.7) * rays;
      a   += rays * 0.7;
      // dust motes
      float motes = pow(max(0.0, sin(uv.x*180.0 + u_t*0.6) * sin(uv.y*140.0 - u_t*0.9)), 28.0);
      col += vec3(1.0,0.95,0.78) * motes * 1.3;
      a   += motes * 0.9;
      // golden hour wash
      col += vec3(1.0,0.78,0.42) * smoothstep(0.7, 0.0, uv.y) * 0.12;
      a   += smoothstep(0.7, 0.0, uv.y) * 0.12;
      // grain + vignette
      float grain = (hash(uv*vec2(1280.0,720.0) + u_t) - 0.5) * 0.06;
      col += vec3(grain); a += abs(grain)*0.3;
      float vig = smoothstep(0.4, 0.95, distance(uv, vec2(0.5)));
      a += vig * 0.4;
      gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
    }`,
  taverna_overlay: `
    void main() {
      vec2 uv = v_uv;
      vec3 col = vec3(0.0); float a = 0.0;
      // warm bokeh dots flickering (string lights feel)
      float bokeh = 0.0;
      for (int i = 0; i < 9; i++) {
        float fi = (float(i)+0.5)/9.0;
        vec2 bp = vec2(fract(fi*1.3 + 0.07), 0.18 + 0.06*sin(fi*9.0));
        float dd = distance(uv, bp);
        float fl = 0.7 + 0.3*sin(u_t*(1.5+fi*3.0)+fi*30.0);
        bokeh += smoothstep(0.07, 0.0, dd) * fl * 0.55;
      }
      col += vec3(1.0,0.78,0.42) * bokeh;
      a   += bokeh * 0.7;
      // floating embers rising
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float ex = fract(fi*0.137 + u_t*0.02);
        float ey = fract(0.3 + fi*0.21 - u_t*0.07);
        float ed = distance(uv, vec2(ex, ey));
        col += vec3(1.0,0.6,0.25) * smoothstep(0.008, 0.0, ed) * 1.6;
        a   += smoothstep(0.008, 0.0, ed) * 0.8;
      }
      // warm sunset wash
      col += vec3(1.0,0.55,0.3) * smoothstep(1.0, 0.4, uv.y) * 0.18;
      a   += smoothstep(1.0, 0.4, uv.y) * 0.18;
      float grain = (hash(uv*vec2(1280.0,720.0) + u_t) - 0.5) * 0.08;
      col += vec3(grain); a += abs(grain)*0.3;
      float vig = smoothstep(0.4, 0.95, distance(uv, vec2(0.5)));
      a += vig * 0.45;
      gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
    }`,
  kafenio_overlay: `
    void main() {
      vec2 uv = v_uv;
      vec3 col = vec3(0.0); float a = 0.0;
      // drifting cigarette smoke
      vec2 sUV = uv * vec2(1.0, 1.4) + vec2(u_t*0.02, -u_t*0.04);
      float smoke = fbm(sUV*2.0);
      smoke *= smoothstep(0.0, 0.4, uv.y) * (1.0 - smoothstep(0.5, 0.85, uv.y));
      col += vec3(0.95,0.92,0.88) * smoke * 0.5;
      a   += smoke * 0.45;
      // window light shaft
      float shaft = exp(-pow((uv.x - 0.25 - uv.y*0.1)*8.0, 2.0)) * (1.0-smoothstep(0.0,0.8,uv.y));
      col += vec3(1.0,0.95,0.75) * shaft * 0.5;
      a   += shaft * 0.4;
      // dust motes
      float motes = pow(max(0.0, sin(uv.x*200.0 - u_t*0.4) * sin(uv.y*160.0 + u_t*0.7)), 32.0);
      col += vec3(1.0,0.95,0.8) * motes * 1.2;
      a   += motes * 0.8;
      // dark moody wash
      col += vec3(0.25,0.15,0.08) * 0.0;
      a   += smoothstep(0.0, 1.0, uv.y) * 0.18;
      float grain = (hash(uv*vec2(1280.0,720.0) + u_t) - 0.5) * 0.1;
      col += vec3(grain); a += abs(grain)*0.4;
      float vig = smoothstep(0.35, 0.95, distance(uv, vec2(0.5)));
      a += vig * 0.55;
      gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
    }`,
  village_overlay: `
    void main() {
      vec2 uv = v_uv;
      vec3 col = vec3(0.0); float a = 0.0;
      // dry summer haze
      float haze = fbm(vec2(uv.x*5.0 + u_t*0.08, uv.y*3.0)) * smoothstep(0.3, 0.7, uv.y);
      col += vec3(1.0,0.9,0.65) * haze * 0.22;
      a   += haze * 0.22;
      // sun spot top-right
      float sd = distance(uv, vec2(0.88, 0.1));
      float sun = smoothstep(0.55, 0.0, sd) * 0.45;
      col += vec3(1.0,0.85,0.5) * sun;
      a   += sun * 0.55;
      // soft white pollen specks drifting
      for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float px = fract(fi*0.173 + u_t*0.03);
        float py = fract(fi*0.291 - u_t*0.02);
        float pd = distance(uv, vec2(px, py));
        col += vec3(1.0) * smoothstep(0.005, 0.0, pd);
        a   += smoothstep(0.005, 0.0, pd) * 0.6;
      }
      float grain = (hash(uv*vec2(1280.0,720.0) + u_t) - 0.5) * 0.07;
      col += vec3(grain); a += abs(grain)*0.3;
      float vig = smoothstep(0.4, 0.95, distance(uv, vec2(0.5)));
      a += vig * 0.4;
      gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
    }`,
  ferry_overlay: `
    void main() {
      vec2 uv = v_uv;
      vec3 col = vec3(0.0); float a = 0.0;
      // sea spray particles
      for (int i = 0; i < 14; i++) {
        float fi = float(i);
        float sx = fract(fi*0.117 + u_t*0.05);
        float sy = fract(0.55 + fi*0.083 + u_t*0.02);
        float sd = distance(uv, vec2(sx, sy));
        col += vec3(1.0) * smoothstep(0.004, 0.0, sd) * 0.9;
        a   += smoothstep(0.004, 0.0, sd) * 0.7;
      }
      // cool blue gradient
      col += vec3(0.3,0.55,0.85) * smoothstep(0.0, 1.0, uv.y) * 0.12;
      a   += smoothstep(0.0, 1.0, uv.y) * 0.12;
      // anamorphic lens flare horizontal streak
      float flare = exp(-pow((uv.y - 0.28)*40.0, 2.0)) * smoothstep(0.0, 0.5, uv.x) * (1.0-smoothstep(0.5,1.0,uv.x));
      col += vec3(0.7,0.85,1.0) * flare * 0.5;
      a   += flare * 0.5;
      float grain = (hash(uv*vec2(1280.0,720.0) + u_t) - 0.5) * 0.06;
      col += vec3(grain); a += abs(grain)*0.3;
      float vig = smoothstep(0.4, 0.95, distance(uv, vec2(0.5)));
      a += vig * 0.45;
      gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
    }`,
  // Transparent atmospheric overlay for the Mykonos PHOTO base.
  // Draws: warm light leak top-right, animated sun glints on lower half,
  // subtle heat shimmer, and soft vignette. All in alpha — premultiplied
  // composite over the photo.
  mykonos_overlay: `
    void main() {
      vec2 uv = v_uv;
      vec3 col = vec3(0.0);
      float a = 0.0;
      // warm light leak from top-right, breathing
      float leakD = distance(uv, vec2(0.92, 0.08));
      float leak = smoothstep(0.55, 0.0, leakD) * (0.55 + 0.15*sin(u_t*0.7));
      col += vec3(1.0, 0.78, 0.42) * leak;
      a   += leak * 0.55;
      // sun glints — sparse, animated, only on lower water band ~0.45..0.78
      float waterBand = smoothstep(0.45, 0.5, uv.y) * (1.0 - smoothstep(0.74, 0.8, uv.y));
      float g1 = pow(max(0.0, sin(uv.x*160.0 + u_t*4.5) * sin(uv.y*55.0 - u_t*1.3)), 24.0);
      float g2 = pow(max(0.0, sin(uv.x*90.0  - u_t*3.1) * sin(uv.y*70.0 + u_t*0.9)), 20.0);
      float glints = (g1 + g2*0.7) * waterBand;
      col += vec3(1.0, 0.97, 0.82) * glints * 1.4;
      a   += glints * 0.9;
      // heat shimmer haze low on horizon
      float haze = fbm(vec2(uv.x*4.0 + u_t*0.15, uv.y*8.0)) * smoothstep(0.4, 0.5, uv.y) * (1.0 - smoothstep(0.55, 0.7, uv.y));
      col += vec3(1.0, 0.95, 0.85) * haze * 0.18;
      a   += haze * 0.18;
      // edge vignette
      float vig = smoothstep(0.45, 0.95, distance(uv, vec2(0.5)));
      col = mix(col, vec3(0.05,0.04,0.08), vig*0.0); // keep color neutral
      a   += vig * 0.35;
      // film grain
      float grain = (hash(uv * vec2(1280.0, 720.0) + u_t) - 0.5) * 0.07;
      col += vec3(grain);
      a   += abs(grain) * 0.3;
      gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
    }`,
  mykonos: `
    void main() {
      vec2 uv = v_uv;
      // sky
      vec3 sky = mix(vec3(0.65,0.91,1.0), vec3(0.26,0.76,0.96), uv.y*2.0);
      // sea (0.5..0.75)
      float seaMask = step(0.5, uv.y) * step(uv.y, 0.78);
      vec2 seaUV = vec2(uv.x, (uv.y - 0.5) * 4.0);
      float waves =
        sin(seaUV.x*30.0 + u_t*1.2 + seaUV.y*2.0)*0.5 +
        sin(seaUV.x*70.0 - u_t*2.0)*0.25 +
        fbm(seaUV*8.0 + vec2(u_t*0.1, 0))*0.5;
      vec3 sea = mix(vec3(0.03,0.24,0.55), vec3(0.09,0.5,0.85), waves*0.5+0.5);
      // sun glitter
      float glint = pow(max(0.0, sin(seaUV.x*120.0 + u_t*5.0) * sin(seaUV.y*40.0)), 12.0);
      sea += vec3(1.0,0.95,0.8) * glint * 0.8 * smoothstep(0.0, 0.6, uv.x) * (1.0-smoothstep(0.7,1.0,uv.x));
      // sand
      float sandMask = step(0.78, uv.y);
      vec3 sand = vec3(0.95,0.89,0.72) + fbm(uv*30.0)*0.08;
      // white houses
      float house = 0.0;
      house += step(0.08, uv.x)*step(uv.x, 0.2)*step(0.4, uv.y)*step(uv.y, 0.52);
      house += step(0.18, uv.x)*step(uv.x, 0.28)*step(0.36, uv.y)*step(uv.y, 0.52);
      // blue dome
      float dome = smoothstep(0.04, 0.038, distance(uv, vec2(0.23, 0.36))) * step(uv.y, 0.36);
      vec3 col = sky;
      col = mix(col, sea, seaMask);
      col = mix(col, sand, sandMask);
      col = mix(col, vec3(0.98), house);
      col = mix(col, vec3(0.05,0.37,0.69), dome);
      gl_FragColor = vec4(col, 1.0);
    }`,
  village: `
    void main() {
      vec2 uv = v_uv;
      // hot sky
      vec3 sky = mix(vec3(0.95,0.85,0.6), vec3(0.85,0.75,0.5), uv.y);
      // sun rays
      vec2 sunPos = vec2(0.85, 0.15);
      vec2 d = uv - sunPos;
      float ang = atan(d.y, d.x);
      float rays = pow(0.5 + 0.5*sin(ang*8.0 + u_t*0.3), 8.0) * (1.0 - smoothstep(0.0, 0.6, length(d))) * 0.4;
      sky += vec3(1.0,0.95,0.8) * rays;
      // dirt ground
      float groundMask = step(0.6, uv.y);
      vec3 ground = vec3(0.64,0.46,0.26) + fbm(uv*15.0)*0.12;
      // tile roof line ~ 0.6
      float roof = 0.0;
      for (int i = 0; i < 14; i++) {
        float fi = (float(i)+0.5)/14.0;
        float d2 = distance(uv*vec2(2.0,1.0), vec2(fi*2.0, 0.6));
        roof += smoothstep(0.04, 0.035, d2) * step(uv.y, 0.6);
      }
      // heat shimmer near horizon
      float shim = sin(uv.y*100.0 + u_t*4.0) * 0.003 * smoothstep(0.55, 0.62, uv.y);
      vec3 col = sky;
      col = mix(col, ground, step(0.6 + shim, uv.y));
      col = mix(col, vec3(0.77,0.34,0.17), roof);
      gl_FragColor = vec4(col, 1.0);
    }`,
  ferry: `
    void main() {
      vec2 uv = v_uv;
      // sky to deep sea gradient
      vec3 sky = mix(vec3(0.64,0.85,0.94), vec3(0.05,0.37,0.69), pow(uv.y, 1.5));
      // procedural water below ~0.5
      float waterMask = step(0.5, uv.y);
      vec2 wUV = vec2(uv.x*4.0, (uv.y-0.5)*8.0);
      float w =
        sin(wUV.x*2.0 + u_t*1.5 + sin(wUV.y*1.5 + u_t)*0.6)*0.5 +
        sin(wUV.x*7.0 - u_t*3.0)*0.2 +
        fbm(wUV + vec2(u_t*0.2, 0))*0.6;
      vec3 water = mix(vec3(0.04,0.18,0.4), vec3(0.13,0.55,0.85), w*0.5+0.5);
      // foam crests
      float foam = smoothstep(0.6, 0.9, w) * smoothstep(0.5, 0.55, uv.y);
      water += vec3(1.0) * foam * 0.7;
      // distant ferry silhouette
      vec2 fUV = uv;
      float ferryY = 0.68;
      float ferryBody = step(0.55, fUV.x)*step(fUV.x, 0.95)*step(ferryY, fUV.y)*step(fUV.y, ferryY+0.05);
      // bow taper
      ferryBody *= step(0.0, (fUV.x-0.55)*0.05 - (fUV.y-ferryY-0.05));
      float ferryCabin = step(0.63, fUV.x)*step(fUV.x, 0.88)*step(0.62, fUV.y)*step(fUV.y, ferryY);
      vec3 col = mix(sky, water, waterMask);
      col = mix(col, vec3(0.03,0.03,0.04), ferryBody + ferryCabin);
      // wake glow
      float wake = exp(-pow((uv.x - 0.7)*4.0, 2.0)) * smoothstep(0.78, 0.7, uv.y) * 0.3;
      col += vec3(1.0) * wake;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

class SceneRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl", { antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: true });
    if (!this.gl) { this.gl = null; return; }
    this.programs = {};
    this.start = performance.now();
    this.currentKey = null;
    this.raf = 0;
    this._initQuad();
  }
  _initQuad() {
    const gl = this.gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  }
  _compile(src, type) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("shader err", gl.getShaderInfoLog(sh), src);
      return null;
    }
    return sh;
  }
  _program(key) {
    if (this.programs[key]) return this.programs[key];
    const gl = this.gl;
    const vs = this._compile(VERT, gl.VERTEX_SHADER);
    const fs = this._compile(FRAG_PRELUDE + SHADERS[key], gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, "a_pos");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error("link err", gl.getProgramInfoLog(p));
      return null;
    }
    this.programs[key] = {
      prog: p,
      u_t: gl.getUniformLocation(p, "u_t"),
      u_res: gl.getUniformLocation(p, "u_res"),
    };
    return this.programs[key];
  }
  play(key) {
    if (!this.gl || !SHADERS[key]) return;
    this.currentKey = key;
    cancelAnimationFrame(this.raf);
    const frame = () => {
      this._drawFrame(key, (performance.now() - this.start) / 1000);
      this.raf = requestAnimationFrame(frame);
    };
    frame();
  }
  stop() { cancelAnimationFrame(this.raf); }
  _drawFrame(key, t) {
    const gl = this.gl;
    const p = this._program(key);
    if (!p) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // transparent clear so overlay shaders composite cleanly
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(p.prog);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(p.u_t, t);
    gl.uniform2f(p.u_res, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  // Render a single frame at a chosen time into an offscreen canvas, then
  // return it as an HTMLCanvasElement we can drawImage into the 2D composite.
  snapshot(key, t = (performance.now() - this.start) / 1000) {
    if (!this.gl) return null;
    this._drawFrame(key, t);
    // return THIS canvas; caller drawImages it
    return this.canvas;
  }
}

// ---------- PHOTO SCENE SUPPORT ----------
// Cache of loaded photo images keyed by URL, plus a draw helper that composites
// "real photo + animated atmospheric shader overlay" — the key visual upgrade.
const _photoCache = new Map();
function loadPhoto(url) {
  if (_photoCache.has(url)) return _photoCache.get(url);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.referrerPolicy = "no-referrer";
  img.src = url;
  _photoCache.set(url, img);
  return img;
}
function drawPhotoCover(ctx, img, w, h) {
  if (!img || !img.complete || !img.naturalWidth) {
    ctx.fillStyle = "#0d5eaf"; ctx.fillRect(0, 0, w, h); return;
  }
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = w / h;
  let dw, dh;
  if (ir > cr) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}
function photoSceneDraw(photoUrl, overlayKey) {
  const img = loadPhoto(photoUrl);
  // re-render once the photo loads so it appears even if the user uploaded before it arrived
  img.addEventListener("load", () => { if (state.img) drawComposite(); }, { once: true });
  return function (ctx, w, h) {
    drawPhotoCover(ctx, img, w, h);
    const r = ensureSceneRenderer();
    if (!r || !r.gl) return;
    if (r.canvas.width !== w || r.canvas.height !== h) {
      r.canvas.width = w; r.canvas.height = h;
    }
    const snap = r.snapshot(overlayKey);
    if (snap) ctx.drawImage(snap, 0, 0, w, h);
    r.play(overlayKey);
  };
}

// init once
let sceneRenderer = null;
function ensureSceneRenderer() {
  if (sceneRenderer) return sceneRenderer;
  const c = document.getElementById("bgGl");
  if (!c) return null;
  sceneRenderer = new SceneRenderer(c);
  return sceneRenderer;
}


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

// Each scene now delegates its drawing to the WebGL renderer.
// `draw(ctx, w, h)` is called once at composite-time to bake a still frame
// into the 2D composite canvas (so Save PNG includes the scene).
// We also kick off the live animated loop on the bg canvas.
function shaderSceneDraw(key) {
  return function (ctx, w, h) {
    const r = ensureSceneRenderer();
    if (!r || !r.gl) {
      // graceful fallback: plain blue
      ctx.fillStyle = "#4aa3df"; ctx.fillRect(0, 0, w, h);
      return;
    }
    // make sure the gl canvas matches our composite size for a clean snapshot
    if (r.canvas.width !== w || r.canvas.height !== h) {
      r.canvas.width = w; r.canvas.height = h;
    }
    const snap = r.snapshot(key);
    if (snap) ctx.drawImage(snap, 0, 0, w, h);
    // also start animating live (idempotent, replaces previous loop)
    r.play(key);
  };
}

const SCENES = [
  {
    id: "acropolis", emoji: "🏛️", label: "Acropolis at noon",
    draw: photoSceneDraw(
      "https://images.unsplash.com/photo-1555993539-1732b0258235?w=1280&q=80",
      "acropolis_overlay"
    ),
    _shader: shaderSceneDraw("acropolis"),
    _legacy(ctx, w, h) {
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
    draw: photoSceneDraw(
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1280&q=80",
      "taverna_overlay"
    ),
    _shader: shaderSceneDraw("taverna"),
    _legacy(ctx, w, h) {
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
    draw: photoSceneDraw(
      "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1280&q=80",
      "kafenio_overlay"
    ),
    _shader: shaderSceneDraw("kafenio"),
    _legacy(ctx, w, h) {
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
    // Real photo base + animated shader overlay (sun glints, light leak, haze)
    draw: photoSceneDraw(
      "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=1280&q=80",
      "mykonos_overlay"
    ),
    _legacy(ctx, w, h) {
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
      photoSceneDraw(
        "https://images.unsplash.com/photo-1503152394-c571994fd383?w=1280&q=80",
        "village_overlay"
      )(ctx, w, h);
      // cats stay — they're the joke
      const rng = mulberry32(7);
      for (let i = 0; i < 7; i++) {
        const cx = rng() * w;
        const cy = h * 0.72 + rng() * h * 0.22;
        const s = 0.7 + rng() * 0.7;
        drawCat(ctx, cx, cy, s);
      }
    },
    _legacy(ctx, w, h) {
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
    draw: photoSceneDraw(
      "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?w=1280&q=80",
      "ferry_overlay"
    ),
    _shader: shaderSceneDraw("ferry"),
    _legacy(ctx, w, h) {
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
  faceBox: null,      // {cx, cy, r} in canvas coords, or null if undetected
  faceDetected: false,
};

// ---------- FACE DETECTION ----------
// Uses the native FaceDetector API (Chrome Android, recent Safari behind flag).
// Falls back to a centered guess when unavailable.
// Returns a Promise<{cx, cy, r} | null> in CANVAS coordinates.
async function detectFaceBoxAsync(img, canvasW, canvasH) {
  if (!("FaceDetector" in window)) return null;
  try {
    const fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await fd.detect(img);
    if (!faces || !faces.length) return null;
    // pick the largest face
    let best = faces[0];
    for (const f of faces) {
      if (f.boundingBox.width * f.boundingBox.height >
          best.boundingBox.width * best.boundingBox.height) best = f;
    }
    const b = best.boundingBox; // in image-pixel coords
    // map image coords -> canvas coords using the same cover-fit as fitImage()
    const ir = img.width / img.height;
    const cr = canvasW / canvasH;
    let dw, dh, dx, dy;
    if (ir > cr) { dh = canvasH; dw = canvasH * ir; dx = (canvasW - dw) / 2; dy = 0; }
    else        { dw = canvasW; dh = canvasW / ir; dx = 0; dy = (canvasH - dh) / 2; }
    const sx = dw / img.width;
    const sy = dh / img.height;
    const fx = dx + b.x * sx;
    const fy = dy + b.y * sy;
    const fw = b.width * sx;
    const fh = b.height * sy;
    return {
      cx: fx + fw / 2,
      cy: fy + fh / 2,
      r: Math.max(fw, fh) * 0.5,
    };
  } catch (err) {
    console.warn("FaceDetector failed:", err);
    return null;
  }
}

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
  img.onload = async () => {
    state.img = img;
    state.faceBox = null;
    state.faceDetected = false;
    polaroid.classList.add("ready");
    if (state.pick.moustache) {
      drawComposite();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawFaceOnly();
    }
    dropzone.classList.add("has-image");
    stopWebcam();
    hint.textContent = "Looking good. Now pull the lever. 👉";
    // kick off async face detection — refines overlay placement once ready
    const box = await detectFaceBoxAsync(img, canvas.width, canvas.height);
    if (box) {
      state.faceBox = box;
      state.faceDetected = true;
      hint.textContent = "Face locked 🎯 — pull the lever.";
      if (state.pick.moustache) drawComposite();
    } else if (!("FaceDetector" in window)) {
      // silent — browser just doesn't support it, the fallback box is fine
    }
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
  // Prefer the cached real detection from FaceDetector; else fall back to a
  // centered guess. Kept synchronous so drawComposite() stays simple.
  if (state.faceBox) return state.faceBox;
  return {
    cx: canvas.width / 2,
    cy: canvas.height * 0.46,
    r: canvas.width * 0.22,
  };
}

// ---------- CINEMATIC POST-PROCESSING ----------
// Applied to the FINAL composite: chromatic aberration on edges, soft bloom on
// highlights, per-scene color grade, stronger vignette, fine film grain.
// Pure Canvas 2D — no extra WebGL pass, keeps it cheap.
const GRADES = {
  acropolis: { rMul: 1.06, gMul: 1.02, bMul: 0.92, lift: 6,  warm: true  },
  taverna:   { rMul: 1.10, gMul: 0.98, bMul: 0.84, lift: 4,  warm: true  },
  kafenio:   { rMul: 0.96, gMul: 0.94, bMul: 0.90, lift: -8, warm: false },
  mykonos:   { rMul: 1.02, gMul: 1.02, bMul: 1.06, lift: 8,  warm: true  },
  village:   { rMul: 1.08, gMul: 1.02, bMul: 0.88, lift: 4,  warm: true  },
  ferry:     { rMul: 0.94, gMul: 0.98, bMul: 1.10, lift: -4, warm: false },
};
// FX state — driven by the left-rail sliders, persisted in localStorage.
const FX_DEFAULTS = {
  exposure: 0,      // -1..+1
  contrast: 1.08,   // 0.6..1.6
  saturation: 1.0,  // 0..1.5
  warmth: 0,        // -1..+1
  grain: 0.4,       // 0..1
  bloom: 0.28,      // 0..1
  chroma: 0.35,     // 0..1
  vignette: 0.55,   // 0..1
  intensity: 1.0,   // 0..1.5  (overlay shader strength — visual hint only here)
};
const FX = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem("greekify.fx") || "{}");
    return Object.assign({}, FX_DEFAULTS, saved);
  } catch { return Object.assign({}, FX_DEFAULTS); }
})();
function saveFx() {
  try { localStorage.setItem("greekify.fx", JSON.stringify(FX)); } catch {}
}

function applyCinematicPost(ctx, w, h, sceneId) {
  const grade = GRADES[sceneId] || GRADES.mykonos;
  // user FX
  const exp   = FX.exposure;
  const con   = FX.contrast;
  const sat   = FX.saturation;
  const warm  = FX.warmth;
  const grainAmt = FX.grain;
  // 1) Color grade + grain via getImageData
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const expMul = Math.pow(2, exp);          // stops
  const warmR = 1 + warm * 0.18;
  const warmB = 1 - warm * 0.18;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i]     * grade.rMul + grade.lift;
    let g = d[i + 1] * grade.gMul + grade.lift;
    let b = d[i + 2] * grade.bMul + grade.lift;
    // exposure
    r *= expMul; g *= expMul; b *= expMul;
    // warmth
    r *= warmR; b *= warmB;
    // s-curve contrast
    r = (r - 128) * con + 128;
    g = (g - 128) * con + 128;
    b = (b - 128) * con + 128;
    // saturation (luma blend)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * sat;
    g = lum + (g - lum) * sat;
    b = lum + (b - lum) * sat;
    // grain
    const n = (Math.random() - 0.5) * 24 * grainAmt;
    d[i]     = r + n < 0 ? 0 : r + n > 255 ? 255 : r + n;
    d[i + 1] = g + n < 0 ? 0 : g + n > 255 ? 255 : g + n;
    d[i + 2] = b + n < 0 ? 0 : b + n > 255 ? 255 : b + n;
  }
  ctx.putImageData(img, 0, 0);
  // 2) Bloom
  if (FX.bloom > 0.01) {
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const octx = off.getContext("2d");
    octx.drawImage(ctx.canvas, 0, 0);
    octx.filter = "blur(14px) brightness(1.6) contrast(1.2)";
    octx.drawImage(off, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = FX.bloom;
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }
  // 3) Chromatic aberration
  if (FX.chroma > 0.01) {
    const ca = document.createElement("canvas");
    ca.width = w; ca.height = h;
    const cctx = ca.getContext("2d");
    cctx.drawImage(ctx.canvas, 0, 0);
    const px = 1 + FX.chroma * 4;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = FX.chroma;
    ctx.drawImage(ca, -px, 0);
    ctx.drawImage(ca,  px, 0);
    ctx.restore();
  }
  // 4) Vignette
  if (FX.vignette > 0.01) {
    const vg = ctx.createRadialGradient(w/2, h/2, w*0.35, w/2, h/2, w*0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,0,0,${0.7 * FX.vignette})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  // 5) Letterbox bars
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, 0, w, 8);
  ctx.fillRect(0, h - 8, w, 8);
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

  // 4.5 CINEMATIC POST-PROCESSING — color grade, bloom, chromatic ab, vignette
  if (state.pick.scene) {
    try { applyCinematicPost(ctx, w, h, state.pick.scene.id); }
    catch (e) { console.warn("post fx skipped:", e); }
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

// ============================================================
// KONAMI EASTER EGG — ↑↑↓↓←→←→BA triggers confetti + bouzouki
// ============================================================
(function konami() {
  const SEQ = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let progress = 0;
  const cvs = document.getElementById("konamiCanvas");
  const banner = document.getElementById("konamiBanner");
  if (!cvs) return;
  const kctx = cvs.getContext("2d");
  let particles = [];
  let running = false;
  let raf = 0;

  function resize() { cvs.width = innerWidth; cvs.height = innerHeight; }
  resize();
  addEventListener("resize", resize);

  const COLORS = ["#0d5eaf","#ffffff","#ffd54f","#ff8a00","#43c1f5","#c4292b"];
  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp  = 6 + Math.random() * 14;
      particles.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        size: 6 + Math.random() * 8,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1,
        shape: Math.random() < 0.35 ? "circle" : "rect",
      });
    }
  }

  function tick() {
    kctx.clearRect(0, 0, cvs.width, cvs.height);
    for (const p of particles) {
      p.vy += 0.45;          // gravity
      p.vx *= 0.995;          // drag
      p.vy *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.006;
      kctx.save();
      kctx.translate(p.x, p.y);
      kctx.rotate(p.rot);
      kctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      kctx.fillStyle = p.color;
      if (p.shape === "circle") {
        kctx.beginPath();
        kctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        kctx.fill();
      } else {
        kctx.fillRect(-p.size * 0.5, -p.size * 0.25, p.size, p.size * 0.5);
      }
      kctx.restore();
    }
    particles = particles.filter(p => p.life > 0 && p.y < cvs.height + 80);
    if (particles.length === 0 && running) {
      running = false;
      cvs.classList.remove("live");
      cancelAnimationFrame(raf);
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  // ---- BOUZOUKI: synthesized plucked-string arpeggio via Web Audio ----
  let audioCtx = null;
  function playBouzouki() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) { return; }
    const ac = audioCtx;
    // D minor pentatonic-ish arpeggio (sounds vaguely Greek/rebetiko)
    const notes = [293.66, 349.23, 440.0, 523.25, 587.33, 523.25, 440.0, 349.23, 293.66, 440.0, 587.33, 880.0];
    const t0 = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = 0.0001;
    master.gain.exponentialRampToValueAtTime(0.6, t0 + 0.05);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
    // light reverb feel via short delay
    const delay = ac.createDelay(0.5);
    delay.delayTime.value = 0.18;
    const fb = ac.createGain(); fb.gain.value = 0.28;
    delay.connect(fb); fb.connect(delay);
    const wet = ac.createGain(); wet.gain.value = 0.35;
    delay.connect(wet); wet.connect(master);
    master.connect(ac.destination);

    notes.forEach((freq, i) => {
      const t = t0 + i * 0.11;
      // pluck = sawtooth + quick lowpass sweep + sharp attack
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(2400, t);
      lp.frequency.exponentialRampToValueAtTime(500, t + 0.4);
      lp.Q.value = 6;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      // octave shimmer on top
      const osc2 = ac.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.value = freq * 2;
      const g2 = ac.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

      osc.connect(lp); lp.connect(g); g.connect(master); g.connect(delay);
      osc2.connect(g2); g2.connect(master);
      osc.start(t); osc.stop(t + 0.45);
      osc2.start(t); osc2.stop(t + 0.3);
    });
  }

  function trigger() {
    if (running) return;
    running = true;
    cvs.classList.add("live");
    banner.classList.remove("live");
    // restart animation by forcing reflow
    void banner.offsetWidth;
    banner.classList.add("live");
    // confetti from bottom-left, bottom-right, and center
    burst(innerWidth * 0.1,  innerHeight * 0.95, 90);
    burst(innerWidth * 0.9,  innerHeight * 0.95, 90);
    burst(innerWidth * 0.5,  innerHeight * 0.6,  60);
    setTimeout(() => burst(innerWidth * 0.5, innerHeight * 0.4, 70), 350);
    setTimeout(() => burst(innerWidth * 0.3, innerHeight * 0.7, 60), 650);
    setTimeout(() => burst(innerWidth * 0.7, innerHeight * 0.7, 60), 650);
    if (navigator.vibrate) navigator.vibrate([30, 40, 30, 40, 80]);
    playBouzouki();
    tick();
  }

  addEventListener("keydown", (e) => {
    const want = SEQ[progress];
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === want) {
      progress++;
      if (progress === SEQ.length) { progress = 0; trigger(); }
    } else {
      progress = (key === SEQ[0]) ? 1 : 0;
    }
  });
  // Mobile fallback: triple-tap on the logo also triggers it
  let taps = 0, tapTimer = 0;
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".logo")) return;
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 600);
    if (taps >= 3) { taps = 0; trigger(); }
  });
})();

// ---------- placeholder canvas tint ----------
(function placeholder() {
  ctx.fillStyle = "#0b0e12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
})();

// ============================================================
// STUDIO MODE — left rail FX sliders, status bar, patch cables
// ============================================================
(function studio() {
  const rack = document.getElementById("fxRack");
  if (!rack) return;
  const SPECS = [
    { id: "exposure",   label: "EXPOSURE",  min: -1,  max: 1,    step: 0.01, fmt: v => v.toFixed(2) },
    { id: "contrast",   label: "CONTRAST",  min: 0.6, max: 1.6,  step: 0.01, fmt: v => v.toFixed(2) },
    { id: "saturation", label: "SAT",       min: 0,   max: 1.5,  step: 0.01, fmt: v => v.toFixed(2) },
    { id: "warmth",     label: "WARMTH",    min: -1,  max: 1,    step: 0.01, fmt: v => v.toFixed(2) },
    { id: "grain",      label: "GRAIN",     min: 0,   max: 1,    step: 0.01, fmt: v => v.toFixed(2) },
    { id: "bloom",      label: "BLOOM",     min: 0,   max: 1,    step: 0.01, fmt: v => v.toFixed(2) },
    { id: "chroma",     label: "CHROMA",    min: 0,   max: 1,    step: 0.01, fmt: v => v.toFixed(2) },
    { id: "vignette",   label: "VIGNETTE",  min: 0,   max: 1,    step: 0.01, fmt: v => v.toFixed(2) },
    { id: "intensity",  label: "INTENSITY", min: 0,   max: 1.5,  step: 0.01, fmt: v => v.toFixed(2) },
  ];
  // throttle redraws (the post-FX loop is heavy at 640px)
  let redrawT = 0;
  function scheduleRedraw() {
    if (redrawT) return;
    redrawT = requestAnimationFrame(() => {
      redrawT = 0;
      if (state.img && state.pick.scene) drawComposite();
    });
  }
  function setSliderTrackPct(input) {
    const pct = ((+input.value - +input.min) / (+input.max - +input.min)) * 100;
    input.style.setProperty("--pct", pct + "%");
  }
  for (const s of SPECS) {
    const wrap = document.createElement("div");
    wrap.className = "fx-slot";
    wrap.innerHTML = `
      <span class="fx-name">${s.label}</span>
      <input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${FX[s.id]}" data-fx="${s.id}" />
      <span class="fx-val" data-out="${s.id}">${s.fmt(FX[s.id])}</span>
    `;
    rack.appendChild(wrap);
    const input = wrap.querySelector("input");
    const out = wrap.querySelector(".fx-val");
    setSliderTrackPct(input);
    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      FX[s.id] = v;
      out.textContent = s.fmt(v);
      setSliderTrackPct(input);
      saveFx();
      scheduleRedraw();
    });
  }
  document.getElementById("fxReset")?.addEventListener("click", () => {
    Object.assign(FX, FX_DEFAULTS);
    saveFx();
    rack.querySelectorAll("input[data-fx]").forEach(inp => {
      const id = inp.dataset.fx;
      inp.value = FX[id];
      const out = rack.querySelector(`[data-out="${id}"]`);
      const spec = SPECS.find(x => x.id === id);
      out.textContent = spec.fmt(FX[id]);
      setSliderTrackPct(inp);
    });
    scheduleRedraw();
  });
  document.getElementById("fxRandom")?.addEventListener("click", () => {
    for (const s of SPECS) {
      const v = s.min + Math.random() * (s.max - s.min);
      FX[s.id] = v;
      const inp = rack.querySelector(`input[data-fx="${s.id}"]`);
      const out = rack.querySelector(`[data-out="${s.id}"]`);
      inp.value = v;
      out.textContent = s.fmt(v);
      setSliderTrackPct(inp);
    }
    saveFx();
    scheduleRedraw();
  });

  // ===== status bar / rack readouts =====
  const rackFace = document.getElementById("rackFace");
  const rackFmt = document.getElementById("rackFmt");
  const rackScene = document.getElementById("rackScene");
  const rackFps = document.getElementById("rackFps");
  const rackCpu = document.getElementById("rackCpu");
  const meterFps = document.getElementById("meterFps");
  const meterCpu = document.getElementById("meterCpu");
  const sbScene = document.getElementById("sbScene");
  const sbFace = document.getElementById("sbFace");
  const sbFps = document.getElementById("sbFps");

  function updateReadouts() {
    rackFace.textContent = state.faceDetected ? "LOCKED" : (state.img ? "fallback" : "—");
    sbFace.textContent  = "face: " + (state.faceDetected ? "locked" : (state.img ? "fallback" : "—"));
    rackFmt.textContent = state.img ? `${state.img.naturalWidth}×${state.img.naturalHeight}` : "—";
    const sc = state.pick.scene ? state.pick.scene.label : "—";
    rackScene.textContent = sc;
    sbScene.textContent = "scene: " + sc;
  }
  // poll, cheap
  setInterval(updateReadouts, 400);

  // fps + fake cpu
  let last = performance.now(), frames = 0, fps = 0;
  function fpsLoop(now) {
    frames++;
    if (now - last > 500) {
      fps = Math.round(frames * 1000 / (now - last));
      frames = 0; last = now;
      rackFps.textContent = fps;
      sbFps.textContent = "fps: " + fps;
      meterFps.style.width = Math.min(100, fps / 60 * 100) + "%";
      const cpu = Math.max(5, Math.min(95, 100 - fps * 1.4));
      rackCpu.textContent = Math.round(cpu) + "%";
      meterCpu.style.width = cpu + "%";
    }
    requestAnimationFrame(fpsLoop);
  }
  requestAnimationFrame(fpsLoop);

  // ===== patch cables =====
  const patch1 = document.getElementById("patch1");
  const patch2 = document.getElementById("patch2");
  function cablePath(ax, ay, bx, by) {
    const dx = bx - ax;
    const sag = Math.min(80, Math.abs(dx) * 0.25 + 30);
    const cx1 = ax + dx * 0.4, cy1 = ay + sag;
    const cx2 = ax + dx * 0.6, cy2 = by + sag;
    return `M ${ax},${ay} C ${cx1},${cy1} ${cx2},${cy2} ${bx},${by}`;
  }
  function drawCables() {
    const rail = document.getElementById("rail");
    const machine = document.querySelector(".slot-panel");
    const polaroid = document.getElementById("polaroid");
    if (!rail || !machine || !polaroid || !patch1 || !patch2) return;
    const r = rail.getBoundingClientRect();
    const m = machine.getBoundingClientRect();
    const p = polaroid.getBoundingClientRect();
    // cable 1: rail (right edge, middle) -> machine (left edge, middle)
    patch1.setAttribute("d", cablePath(r.right, r.top + r.height * 0.45, m.left, m.top + m.height * 0.5));
    // cable 2: machine (right) -> polaroid (left)
    patch2.setAttribute("d", cablePath(m.right, m.top + m.height * 0.5, p.left, p.top + p.height * 0.45));
    document.body.classList.add("cables-on");
  }
  // wait until layout is stable & rack-mod anims start
  setTimeout(drawCables, 600);
  addEventListener("resize", drawCables);
  addEventListener("scroll", drawCables, { passive: true });
  // redraw cables periodically — polaroid moves when image loads
  setInterval(drawCables, 1000);
})();
