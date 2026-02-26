# Zenith Particles – Gesture‑Controlled 3D System

Zenith Particles is a **real‑time, gesture‑controlled 3D particle experience** built for the browser.  
Using only your **webcam and hands**, you can bend a galaxy, carve cubes out of stardust, and shape fluid wave fields made of **tens of thousands of GPU‑accelerated particles**.

This project is designed as both a **visual showpiece** and a **reference implementation** of:

- **Webcam‑based hand tracking** with MediaPipe
- **Physically‑inspired particle shaders** in Three.js
- **Gesture‑driven camera + scene control** in a modern React + Vite stack

---

## ✨ What’s unique about Zenith?

- **Pure gesture interface – no mouse or keyboard**
  - All core interactions (zoom, orbit, particle density, visual feedback) are driven by **hand poses and swipes**, not UI sliders.
  - You see your own hand feed in the corner while the particle universe responds in real time.

- **High‑density GPU particle field**
  - Defaults to **80,000+ particles**, and can scale up to **200,000** via vertical swipe gestures.
  - Custom GLSL vertex + fragment shaders render **glowing, star‑like points** with halos, spikes, and proximity‑based brightening.

- **Dual‑hand, physics‑inspired control**
  - Each particle is pre‑assigned to **one of two “hand domains”** so both hands can influence different halves of the field.
  - Hand position, smoothed velocity, and fist/open state are fed into shader **uniforms** that drive attraction, repulsion, and flow.

- **Gesture vocabulary wired into the engine**
  - **Fist**: Pulls the camera **out** (zoom out).
  - **Open hand**: Moves the camera **in** (zoom in).
  - **X / Y motion**: Orbits the camera around the scene.
  - **Swipe up / down**: Increases / decreases **particle count** (atom density) in real time.

- **Cinematic UI & post‑processing**
  - A glass‑morphism control HUD (`UIOverlay`) with status chips, “Neural Link” toggle, real‑time gesture labels, and engine stats.
  - Post‑processing stack with **Bloom, Noise, Vignette, and Chromatic Aberration** for a cinematic, holographic look.

Together, this makes Zenith not just another particle demo, but a **gesture‑native sandbox** for experimenting with human–computer interaction through vision and physics.

---

## 🧠 Concept & architecture

At a high level, Zenith is a **closed loop** between:

1. **Your hands** (captured by the webcam)
2. **HandTracker** (MediaPipe Hands → normalized `HandData`)
3. **App state & SceneController** (gestures → camera + particle parameters)
4. **ParticleSystem** (GPU shader using those parameters to move particles)
5. **UIOverlay** (visual feedback, controls, and configuration)

### 1. Hand tracking (`components/HandTracker.tsx`)

- Uses **MediaPipe Hands** loaded from a CDN to detect up to **two hands**.
- Extracts landmarks, calculates:
  - **Center position** (`landmarks[9]`) as normalized \((x, y, z)\)
  - **Velocity**, smoothed over time (to avoid jitter)
  - **Finger count**, fist / open / pinch detection
  - **Vertical swipe gestures** (`SWIPE_UP` / `SWIPE_DOWN`) from velocity
- Produces a simple **`HandData`** object for each hand:
  - `center`, `velocity`, `rotation`, `fingerCount`
  - booleans like `isFist`, `isOpen`, `isPinching`
  - `gesture` label (e.g. `FIST`, `OPEN`, `SWIPE_UP`)
- Optionally draws a **skeleton overlay** on top of the webcam feed when `showSkeleton` is enabled.

This keeps the 3D world **decoupled** from the raw MediaPipe API – the rest of the app just consumes clean `HandData[]`.

### 2. Application state & gesture routing (`App.tsx` / `types.ts`)

The core state is defined via `AppState`:

- `particleCount` – number of particles (10k → 200k)
- `currentShape` – `'GALAXY' | 'CUBE' | 'WAVE'`
- `particleSize` – base point size passed into the shader
- `colorPalette` – name of the palette used by the shader
- `glowIntensity` – passed into the bloom post‑processing
- `isCameraMirrored`, `showSkeleton`, `isGestureActive` – camera/UI behavior toggles

**Key logic:**

- When **gesture control is inactive**, hand data is **ignored**, and the orbit controls fall back to traditional mouse input.
- When **gesture control is active**, `handleHandsUpdate`:
  - Saves the latest `HandData[]`
  - Applies **gesture cooldowns** to avoid spamming state updates
  - Handles **`SWIPE_UP` / `SWIPE_DOWN`** to increase or decrease `particleCount` in discrete steps, clamped between 10k and 200k

### 3. Camera control (`SceneController` inside `App.tsx`)

`SceneController` runs on every render frame and:

- Reads the current `HandData[]` and `AppState`.
- If gesture control is active and hands are present:
  - Computes the **average hand position**.
  - Smoothly maps that average to camera **rotation targets**:
    - X movement → yaw
    - Y movement → pitch
  - Uses **open vs fist** states to move a **zoom target** in or out.
  - Lerps camera position and rotation for **smooth motion** with a fixed `LERP_VAL`.

The result is a camera that feels like it’s attached to an **invisible dolly** driven by your hands, not a mouse.

### 4. Particle engine (`components/ParticleSystem.tsx`)

`ParticleSystem` is where the magic happens:

- Creates large typed arrays for:
  - `positions`, `targetPositions` (current vs target shape positions)
  - `colors` (sampled from `PALETTES[colorPalette]` with small variations)
  - `sizes` (per‑particle base size)
  - `handIndex` (assigning each particle to **hand 1 or hand 2**)
- Uses `getShapePosition(shape, i, particleCount, seed)` to compute:
  - **GALAXY** spirals
  - **CUBE** distributions
  - **WAVE** patterns  
  (see `utils/shapes.ts` for the exact math and distributions)
- Uploads those arrays as attributes to a `bufferGeometry`:
  - `position`, `targetPosition`, `color`, `size`, `handIndex`

On every frame:

- A custom **vertex shader**:
  - Blends between `position` and `targetPosition` via `uTransition` for **smooth shape morphing**.
  - Adds subtle **noise‑based drift** so particles never fully freeze.
  - Reads **hand uniforms** (`uHandPos[1/2]`, `uHandVel[1/2]`, `uHandForce[1/2]`, `uFistFactor[1/2]`).
  - Applies:
    - **Velocity‑driven flow** around the hands
    - **Attraction / repulsion** based on distance and fist vs open
  - Sets `gl_PointSize` based on `uSize`, per‑particle size, and depth.

- A custom **fragment shader**:
  - Renders each point as a **soft, glowing star** with:
    - A bright nucleus + core
    - Cross‑shaped spikes
    - Radial glow and twinkle variation
  - Boosts brightness based on proximity to hands to emphasize interaction.

This approach keeps **all heavy lifting on the GPU**, so even high particle counts feel fluid.

### 5. UI & interaction layer (`components/UIOverlay.tsx`)

The overlay:

- Shows engine/status info: structure, atom count, sensor status, engine flags.
- Lets you:
  - **Start/stop** the “Neural Link” (gesture control toggle).
  - Pick between **GALAXY, CUBE, WAVE** shapes.
  - Adjust **particle size** and **color palette**.
  - Toggle the **skeleton feed** (hand landmark visualization).
- Mirrors gesture state:
  - Displays the **current gesture name** (`FIST`, `OPEN`, `SWIPE_UP`, etc.) when gesture control is active.

Visually it uses a **glass‑morphism, control‑deck aesthetic** built with utility‑style Tailwind‑like classes.

---

## 🛠 Tech stack

- **Framework**: React 19 + TypeScript
- **Bundler / Dev server**: Vite
- **3D Engine**: Three.js via `@react-three/fiber`
- **Helpers**: `@react-three/drei` (camera, controls, helpers)
- **Post‑processing**: `@react-three/postprocessing` (Bloom, Noise, Vignette, Chromatic Aberration)
- **Hand tracking**: MediaPipe Hands (loaded from CDN)
- **Styling**: Tailwind‑style utility classes + custom glass‑panel styles

---

## 🚀 Getting started

### 1. Prerequisites

- **Node.js** ≥ 18
- A laptop/desktop with a **webcam**
- A modern browser (Chrome, Edge, or similar)

### 2. Install dependencies

```bash
git clone https://github.com/<your-username>/Zenith-Particles-Gesture-Control-3D-System.git
cd Zenith-Particles-Gesture-Control-3D-System
npm install
```

> If you forked or renamed the repository, adjust the URL accordingly.

### 3. Run the development server

```bash
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`).  
Open it in your browser and allow **camera access** when prompted.

---

## ✋ Gesture guide

When **Core Neural Link** is **initialized** (toggle in the left control panel), the system starts responding to your hands:

- **Fist**
  - Camera zooms **out**, pulling away from the particle field.

- **Open hand**
  - Camera zooms **in**, flying closer to the particles.

- **X/Y motion (hand moving left/right/up/down)**
  - Orbits the camera around the center of the scene.

- **Swipe up**
  - Increases **particle count** (“Atom Density”), making the structure denser and more complex.

- **Swipe down**
  - Decreases **particle count**, lightening the scene.

Additional toggles in the UI:

- **Skeleton Feed**
  - Shows or hides the **MediaPipe hand skeleton** overlay on top of the webcam feed.

- **Color Spectrum**
  - Switch between palettes (`Rainbow`, `Fire`, `Ocean`, `Cosmic`, `Forest`, `Neon`, `Gold`, `Monochrome`, etc.).

- **Structural Template**
  - Choose which **macro structure** the particles adhere to:
    - `GALAXY` – swirling disk with spiral arms
    - `CUBE` – volumetric, architectural cloud
    - `WAVE` – flowing wave‑like formations

---

## ⚙️ Configuration & extension points

You can tweak the experience without changing the shader math too much:

- **Initial defaults**  
  `INITIAL_STATE` in `App.tsx` controls the startup configuration:
  - `particleCount`, `currentShape`, `animationSpeed`, `colorPalette`, `particleSize`, `glowIntensity`, etc.

- **Color palettes**  
  Edit `PALETTES` in `types.ts` to:
  - Add new named palettes (e.g. `Aurora`, `Cyberpunk`)
  - Reorder or recolor existing ones.

- **Shapes / formations**  
  The `getShapePosition` helper in `utils/shapes.ts` defines how particles are distributed for each shape.  
  You can:
  - Add new `ShapeType` values in `types.ts`.
  - Implement their distributions in `getShapePosition`.
  - Expose them via the **Structural Template** section in `UIOverlay`.

- **Gestures**
  - Modify detection thresholds or add new gesture types in `HandTracker.tsx`.
  - Route them into scene behavior inside `handleHandsUpdate` and/or `SceneController`.

---

## 🧪 Ideas for further experimentation

- **More gestures**
  - Use pinch distance, rotation, or multi‑hand symmetry to control:
    - Shape morph speed
    - Palette blending
    - Physics strength

- **Audio reactivity**
  - Combine gesture input with audio analysis to drive particles with **music + motion**.

- **Saving & sharing presets**
  - Serialize `AppState` (shape, palette, counts, toggles) into sharable URLs.

- **Mixed‑reality overlays**
  - Composite the particle field behind / around the user video feed for AR‑like visuals.

---

## 📦 Production build

To generate a production‑ready build:

```bash
npm run build
```

This will output an optimized bundle in the `dist` directory.  
You can preview it locally with:

```bash
npm run preview
```

Then deploy `dist` to any static hosting provider (Netlify, Vercel, GitHub Pages, etc.).

---

## 📖 Summary

Zenith Particles is a **gesture‑driven, GPU‑accelerated 3D particle lab** that turns your hands into a controller for a living galaxy.  
It combines **real‑time computer vision**, **custom GLSL shaders**, and a **polished UX** to demonstrate what’s possible when modern web graphics meet intuitive, camera‑based interaction.

