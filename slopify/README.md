# Eyzon-me - Chrome extension

A local, webcam-powered focus companion named **Eyzon**. Eyzon-me sounds like “eyes on me.” One control tab owns the camera; a draggable placeholder pixel pet accompanies you on normal websites. No API keys, server, installer, recordings, or saved progress.

## Load the ready-built extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and choose the `slopify/extension-dist` folder in this project.
4. Pin **Eyzon-me**, then click its icon to open the dashboard.
5. Allow camera access, click **Test camera**, then **Calibrate camera**. Begin full-screen calibration, look at each dot, and press Space or click it. Follow four corners, four edges, the center, then five independent accuracy checks. Choose **Use this calibration** when it passes.
6. Click **Start session**, then visit a regular website. Refresh tabs that were already open when the extension was installed.

Keep the control tab open. You can switch to any other tab while it tracks. Closing the control tab or clicking Stop session stops the camera and removes the website pets. Chrome settings, the Chrome Web Store, other extensions, protected documents, and some fullscreen/top-layer content cannot display injected pets. Only normal HTTP/HTTPS pages are supported; not file URLs or incognito mode.

Drag the larger pet anywhere in the viewport to set its resting spot, or focus it and use the arrow keys. When distracted it runs toward an approximate calibrated gaze position. This is not precise cursor control; off-screen gaze is clamped to the page and missing faces have no target. Placement is shared across tabs for the current browser session. Hidden tabs do not animate the pet. The pet footprint captures dragging; the rest of the website stays clickable.

## Focus and testing

Focus starts at 100. Glances shorter than 0.75 seconds are ignored, then distraction drains 10 points/second. Recovery is 5 points/second. Studying: 80-100; Suspicious: 50-79; Panicking: 20-49; Fainted: below 20. A fainted pet revives only above 40.

Diagnostics has Simulate Distraction, Simulate Focused, a focus-score override, and Return to Live Tracking. Choose a simulation mode, then Start session to show the pet without a camera. Camera testing/calibration alone never spawns a website pet.

If camera access fails, allow the extension's camera permission and Windows desktop camera access, close other camera apps, check the hardware shutter, and retry. No webcam images, landmarks, iris features or calibration weights are sent to websites; the isolated overlay receives only session state, score, mood, normalized estimated target, calibration viewport bounds, local reaction text, and pet position.

## Development

From `slopify/` run:

- `npm install`
- `npm run build` - creates `extension-dist`; then reload the extension in Chrome.
- `npm test` - focus, mood, placement, and calibration tests.
- `npm run lint`
- `npm run dev` - dashboard design preview only. Full camera-session coordination and website overlays require the built extension.

The first build can download the MediaPipe face model if absent. Existing bundled WASM/model files are preserved. The installed extension runs offline and requests no external services. Browser session storage holds only the control-tab identifier, pet state and position; it never stores recordings or permanent history.

The camera/model loading and cleanup pipeline in `components/FocusTracker.tsx` is preserved; local iris features accompany its existing face/head observations. `hooks/useFocusSession.ts` handles scoring, `hooks/useScreenCalibration.ts` controls collection, and `lib/screen-gaze.mjs` learns the small screen map. `extension/background.ts` coordinates a single control tab and visible website viewers. `components/PetCompanion.tsx` and `components/pet.css` are the temporary rendering layer to replace when the sprite folder arrives; no sprite naming or frame dimensions are assumed yet.

XP, levels, Pomodoro, AI dialogue, remote endpoints, Electron and gameplay popups are intentionally excluded from this baseline.

## Eyzon’s Gradium voice (v0.5)

Eyzon introduces itself when a session starts and speaks its scripted focus reactions using Gradium-generated audio. Use **Test Eyzon’s voice** before a session, **Stop speaking** to interrupt a line, or switch off **Eyzon’s voice** to mute callouts. Looking back, Stop, calibration, and closing the dashboard cancel speech. Only the dashboard plays audio, so multiple website pets do not talk over one another. Speech bubbles remain available when muted.

All eleven WAV clips are bundled locally, using Gradium’s Emma voice. Generation uses the [Gradium REST TTS endpoint](https://docs.gradium.ai/guides/text-to-speech-rest). This is scripted speech, not an open-ended chatbot or live API request on every distraction. Playback works offline, loads one clip at a time, and makes no Gradium requests during a session. A missing clip falls back to the device voice with a visible status message; blocked autoplay asks you to click the voice test button.

To change lines, edit `lib/voice-lines.mjs`, set `GRADIUM_API_KEY` in your shell or ignored `.env.gradium.local`, then run `npm run voice:generate` and `npm run build`. `GRADIUM_VOICE_ID` optionally selects another Gradium voice. The generation command reuses unchanged clips and saves completed requests if interrupted. The key is used only by the local generation script and is never copied into the extension, a content script, or its manifest. Only the short scripted text is sent to Gradium; webcam data never leaves the local tracker.

## Validation

The extension is tested using an isolated Chromium profile with a deterministic synthetic camera. Local unit tests cover focus timing, threshold boundaries, faint revival, stable calibration and viewport position clamping. Browser checks cover actual extension CSP/WASM inference, preflight, calibration, website overlays, dragging, navigation, mood transitions, and session cleanup. Physical webcam accuracy still needs checking with your camera and lighting.

## Performance notes

The extension removes the separate Electron application, all video decoding, the popup renderers, and video conversion tooling. A single control tab owns one MediaPipe worker; website overlays do not load the model. Only mood changes and low-frequency session snapshots cross extension messages. Hidden website pets are unmounted.

The isolated Chromium verification browser measured about 360 MiB of private memory after the lifecycle tests, including Chromium, test pages, and the extension. The earlier desktop workflow measured about 692 MiB with three gameplay windows. These are different workloads, not an exact percentage comparison or a guarantee of your normal Chrome footprint. Camera inference still has a substantial WASM/browser memory cost. Physical-camera performance depends on your device.

## Cozy dashboard and pet reactions (v0.3)

The dashboard uses locally bundled Pixelify Sans for headings/buttons and system-font body text for readability. Its warm pixel-art study nook is drawn in SVG/CSS, without image downloads or a rendering library. Fonts and the vision model work offline.

When distracted, the pet jumps and pulses continuously, with faster motion and more urgent local reaction lines as focus falls. Below 30 it trembles more strongly; fainting stops pursuit until recovery above 40. Voice callouts can be muted in the dashboard. Only the control tab speaks, preventing duplicate audio from website tabs. Speech can be unavailable or blocked by the browser; bubbles still work. Reduced-motion mode disables pursuit, jumping, flashing and idle animations while preserving status and callouts.

Diagnostics includes Test gaze X/Y sliders for demonstrating pursuit in simulation/override mode. The pet uses acceleration and braking, direction changes and articulated run cycles, plus idle breathing, blinks and tail motion. Hidden website tabs cancel their animation loops.

After updating, click **Reload** on Eyzon-me at `chrome://extensions`, reopen the dashboard, and refresh existing website tabs. Refreshing the dashboard alone does not update Chrome's background worker/content scripts.

## Screen calibration and steady attention (v0.4)

The existing MediaPipe model supplies iris position relative to each eye, binocular direction and head pose. A small, regularized local regression using MIT-licensed `ml-matrix` learns screen coordinates from nine point medians. It adds no second camera, TensorFlow.js runtime or neural network. Samples are bounded and the model is held only in control-tab memory.

Five fresh points measure average/largest error in CSS pixels. A map is rejected if mean error exceeds 12% of the viewport diagonal, maximum error exceeds 22%, either mean axis error exceeds 14% of that axis, or there is no distinct iris motion. These are usability checks, not research-grade accuracy guarantees. The synthetic browser fixture produced an 8 px average error; that measures the software pipeline, **not physical webcam accuracy**.

Full screen places points near the monitor corners. If the browser blocks full screen, the UI explicitly labels this window calibration; maximize the window or allow full screen and retry for broader coverage. Hold a comfortable, steady head position; use even lighting and clean glasses. Blinks pause capture and face loss resets the current point. Hidden tabs do not collect calibration samples. Start requires a usable calibration. Recalibration pauses the session; Cancel preserves the previous map. Escape, moving/resizing the calibration window or changing display scale during collection cancels safely. Recalibrate after changing posture, camera, monitor or display scaling. Normal window placement/zoom is accounted for when mapping a calibrated target to website coordinates on the same monitor.

Attention uses a five-sample median, time-based smoothing, separate leave/return thresholds, blink/dropout tolerance and a sustained-change confirmation. Score, callouts and pursuit share this one decision. A calibrated on-screen corner is treated as on-screen even when raw eye-expression coefficients are high. Head turns, prolonged eye closure, sustained off-screen gaze and face departure still count as distraction. The Gentle/Balanced/Strict setting adjusts response tolerance without restarting the camera.

Browser verification covers actual bundled WASM inference under extension CSP, nine-point collection, Space/click controls, face-loss pause, five independent checks, Start gating, corner focus, calibrated website targets, cancellation preserving a map, single camera/worker, and Stop cleanup. Deterministic observations are injected after real inference to exercise the gaze flows. Physical gaze accuracy must be checked with your own webcam.

### Open-source screen-gaze tools researched

- [WebEyeTrack](https://github.com/RedForestAI/WebEyeTrack/tree/main/js): browser gaze estimation with normalized 2D screen coordinates, [MIT license](https://github.com/RedForestAI/WebEyeTrack/blob/main/LICENSE). The current package includes TensorFlow.js/BlazeGaze and a worker-loader-based proxy with its own webcam client. It is a candidate for a future accuracy comparison; using it here would require adapting its worker/model integration to MV3 and our single-camera pipeline. **It is not installed or used in this build.**
- [WebGazer](https://github.com/brownhci/WebGazer): well-known browser screen-coordinate tracking, but its maintainers report maintenance ended February 24, 2026, and the repository uses GPL licensing. It was not added.
- [RealEye Light Open](https://github.com/RealEye-io/webcam-eyetracker-light-open): another browser screen-gaze implementation; its current repository is AGPL-3.0/commercial dual licensed. It was not added.

This build uses our existing MediaPipe observations with a measured calibration map. It does not claim to match a dedicated gaze model or an infrared eye tracker.
