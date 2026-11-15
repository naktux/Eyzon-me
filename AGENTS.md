# AGENTS.md - Eyzon-me

## Project Overview
This is a Next.js web application featuring an **AI Focus Companion Pet** powered by real-time client-side webcam eye-tracking. The user sets a study/work goal and starts a focus session. Using MediaPipe eye-tracking, the app monitors whether the user is looking at their screen. When the user is focused, the pet studies alongside them and earns XP; when the user looks away or gets distracted, the pet reacts dynamically with animated mood states, task-aware AI speech bubbles, and voice callouts to bring their attention back.

## Tech Stack & Libraries
- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Computer Vision / Eye Tracking:** `@mediapipe/tasks-vision` (`FaceLandmarker` running strictly client-side via bundled WASM/model files in `/public/`)
- **AI Dialogue Generation:** Next.js API route (`/app/api/pet-react/route.ts`) using OpenAI/Groq SDK (with instant local fallback lines if no API key is set)
- **Voice Output:** Browser native `window.speechSynthesis` (zero latency, no extra API keys required)

## Architecture & Directory Structure
- `/app/page.tsx`: Main dashboard featuring the Pet Stage, current task input, Pomodoro timer, Focus XP bar, and webcam preview/debug controls.
- `/app/api/pet-react/route.ts`: Lightweight endpoint that generates a short, witty, task-specific reaction line based on the user's `currentTask`, `moodState`, and `distractionCount`.
- `/components/FocusTracker.tsx`: Existing client-side MediaPipe component that outputs `focusScore` (0–100) and `isFocused` boolean. **Preserve the working local WASM/model loading setup.**
- `/components/PetCompanion.tsx`: Animated SVG/CSS interactive character with smooth state transitions (`studying`, `suspicious`, `panicking`, `fainted`), speech bubble UI, and voice synthesis playback.

## Focus Score & Pet Mood States
`PetCompanion.tsx` maps the real-time `focusScore` (0–100) to four distinct moods:
- **80–100 (`studying`):** Pet wears tiny glasses, sits at a mini desk/book, calm bobbing animation, green aura. Accumulates Focus XP over time.
- **50–79 (`suspicious`):** Pet pauses, narrows eyes, displays a floating `?` icon, and leans forward checking on the user.
- **20–49 (`panicking`):** Pet sweats, waves arms frantically, displays a red `!` alert, and triggers an AI voice/speech bubble roast referencing the user's `currentTask`.
- **0–19 (`fainted`):** Pet collapses dramatically on the floor with dizzy eyes until `focusScore` recovers above `40`.

## Coding Guardrails
- **Preserve MediaPipe Assets:** Do not delete or overwrite the bundled WASM or `face_landmarker.task` files in `/public/`.
- **Strict Client-Side Vision:** Keep `FocusTracker.tsx` marked `"use client"` and never send webcam video frames to any backend route.
- **Rate-Limit AI Calls:** Enforce a strict cooldown (minimum 12–15 seconds between API calls) when triggering `/api/pet-react` so rapid gaze fluctuations don't spam the LLM API.
- **Graceful Fallbacks:** Include hardcoded, witty fallback reaction lines in the frontend so the pet still speaks and roasts the user even if `OPENAI_API_KEY` or `GROQ_API_KEY` is missing or offline.
- **Testing Controls:** Keep a manual **"Simulate Distraction"** button and `focusScore` slider so the pet's moods and AI dialogue can be tested effortlessly during demos.


## Approved Chrome extension baseline (supersedes conflicting requirements above)
- Deliver a Chrome Manifest V3 extension using React, TypeScript, Tailwind and Vite, not Next.js or Electron. No server/API route is included in this baseline.
- One visible extension control tab owns the unchanged FocusTracker component and its worker/model. Keep this tab open while using other websites; closing it stops the session.
- Preserve camera preflight, camera selection, tracking guides, calibration-before-start, and the actual bundled WASM/model files. Never send frames or landmarks to website scripts or servers.
- Website pet overlays use isolated Shadow DOM, sit at the bottom, and are horizontally draggable. No autonomous walking. Hidden website tabs do not animate; ordinary HTTP/HTTPS pages only.
- Use a temporary pixel-art placeholder. The user will supply a sprite folder later; do not assume its naming or frame layout.
- Only implement baseline pet moods, focus meter, vision tracking and dashboard. Defer XP/levels, task input, timer, speech, AI dialogue and LLM/API integrations.
- Score drain is 10 points/second after 0.75s grace, recovery 5 points/second. Fainted stays latched until score exceeds 40.
- Keep Simulate Distraction, Simulate Focused, score override, and Return to Live Tracking.
- Remove obsolete desktop/video code and app-copied media. Leave original media outside the app untouched.
- No permanent user history/progress. chrome.storage.session may hold session coordination and normalized pet position only.

## Latest interaction and dashboard changes
- The pet is larger and may move throughout the current viewport. When distracted, it runs toward a coarse, calibrated eye/head direction estimate; this is not precise point-of-regard tracking. Missing faces have no target.
- Direction fields may be added to FocusTracker observations; preserve its camera, model loading, worker and cleanup pipeline. Only normalized estimated targets go to website overlays, never raw landmarks/frames.
- Use lightweight acceleration/braking, run cycles, idle breathing/blinks/tail motion, escalating jumps and warm outline pulses. Strong pre-faint trembling starts below 30; fainting stops pursuit until recovery above 40.
- Local speech bubbles and optional speechSynthesis callouts are now authorized; include a voice toggle, cancel pending voice on Stop/mute/recovery, and do not add LLM/API calls.
- Respect reduced-motion preferences and stop animation loops in hidden tabs.
- Dashboard uses a cozy pixel-art theme with bundled Pixelify Sans display text, readable system-font body text, warm paper/wood/sage colors and code-native study-nook decoration. No remote fonts/art or extra model instances.

## Screen calibration update
- Calibrate at four screen corners, four edges and center, followed by independent check points. Use fullscreen with a clearly labeled window fallback; retain an old usable map on Cancel and require a usable calibration before live Start.
- Preserve the single MediaPipe camera/worker. Local iris features and a small regularized in-memory regression may learn an approximate screen gaze point. No raw features, landmarks, frames or calibration weights go to website overlays.
- Only normalized target estimates and calibration viewport bounds accompany existing session messages, for positioning the website pet. No second neural network, remote service or permanent calibration storage.
- Keep one stabilized attention decision for score, pursuit and speech. Calibrated on-screen corners must not be misclassified by uncalibrated eye-expression thresholds. Report held-out accuracy honestly and reject poor maps.

## Project identity and verification preference
- Project/product name: Eyzon-me, with this exact spelling and capitalization.
- Companion character name: Eyzon. The name Eyzon-me is a play on "eyes on me."
- Keep future verification lightweight and targeted; avoid lengthy or strenuous test runs unless needed for a specific issue.

## Gradium voice update
- Eyzon’s scripted dialogue uses Gradium-generated, bundled voice clips. Keep the API key in an ignored local environment file, never browser source, public assets, session messages or build artifacts.
- Generate clips with scripts/generate-voice.mjs using the documented Gradium REST text-to-speech API. This provider use for scripted text is authorized. Webcam frames/features remain strictly local.
- Play one clip at a time in the control tab. Provide Test voice, mute, and Stop speaking. Stop/recovery/calibration must cancel playback. Keep bubbles and device-speech fallback if clips cannot play.
- Keep offline playback and the existing single camera worker. No runtime TTS backend or additional model is needed for these fixed callouts.
