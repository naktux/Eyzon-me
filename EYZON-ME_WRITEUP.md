## Inspiration

It is easy to sit down with work open and still find your attention drifting. We wanted to make that moment visible through a companion you could care about: a little character who notices when you look away and asks you to come back.

The project originally explored increasingly chaotic videos as a way to pull attention back to the screen. As we developed it, the more interesting idea became the relationship with a character. That became Eyzon, a small study buddy whose mood changes with your attention. The name **Eyzon-me** sounds like **"eyes on me"**, which captures both the eye-tracking interaction and Eyzon's personality.

## What it does

Eyzon-me is a Chrome extension that puts an animated pixel companion on regular websites. Before starting, users can test their webcam and calibrate their gaze by looking at the screen's corners, edges, and center. Separate check points help identify an unreliable calibration.

During a session, the extension uses eye direction, head pose, and face visibility to estimate whether the user is looking toward the screen. A focus meter drives four character states:

- **Studying:** Eyzon calmly keeps you company.
- **Suspicious:** Eyzon notices your attention slipping.
- **Panicking:** Eyzon becomes increasingly frantic, jumping, waving, and calling you back.
- **Fainted:** Eyzon collapses until your focus recovers.

When distracted, Eyzon can run toward an approximate calibrated gaze position. Users can also drag the companion to choose a resting spot. Gradium-generated speech gives Eyzon a greeting and playful callouts, with voice testing, mute, and Stop speaking controls.

Webcam processing stays on the device. The gaze estimate is approximate: looking at the screen does not prove someone is mentally focused or working productively.

## How we built it

We built the current application as a Chrome Manifest V3 extension using **React, TypeScript, Vite, and Tailwind CSS**. One dashboard tab owns the webcam and tracking worker. Website overlays display Eyzon inside isolated Shadow DOM, allowing the character to appear across tabs without loading another camera model on every page.

**MediaPipe Face Landmarker** runs locally through WebAssembly. We use its iris landmarks, eye-direction signals, and head pose to learn a small screen-coordinate mapping with **ml-matrix**. Median filtering, time-based smoothing, and separate thresholds for looking away and returning help stabilize the result.

Eyzon's placeholder artwork and animations use SVG and CSS, with lightweight movement physics for acceleration and braking. The dashboard combines a warm study-room palette, pixel headings, and readable body text.

We used **Gradium's text-to-speech API** to generate eleven scripted voice clips. These are bundled with the extension for offline playback, keeping the API key out of the distributed application.

## Challenges we ran into

The biggest challenge was turning noisy webcam signals into a useful interaction. Blinks, brief face-detection failures, normal reading movements, and small head movements could make the focus state jitter. We added smoothing, confirmation delays, and calibration checks, and made scoring, movement, and reactions share the same attention decision.

Performance also shaped the project. The earlier desktop and video approach consumed too many resources. Moving to an extension, keeping one tracking worker, removing video playback, and stopping hidden-tab animations helped reduce unnecessary work.

Browser constraints introduced another set of problems: camera permissions, extension security rules, local model loading, autoplay restrictions, and stopping media cleanly. We also needed speech that felt responsive without exposing credentials or making an API request for every distraction. Generating the fixed voice lines ahead of time addressed that tradeoff.

## Accomplishments that we're proud of

- Turning a focus meter into an expressive companion with recognizable moods and personality.
- Making Eyzon work across regular browser tabs while keeping webcam processing local.
- Building a guided calibration flow that measures its result and rejects poor mappings.
- Giving Eyzon a Gradium voice while preserving offline playback and keeping credentials out of the extension.
- Adding practical controls, including camera preflight, manual simulations, sensitivity settings, mute, and reduced-motion support.

## What we learned

We learned that a working vision model is only one part of a usable eye-tracking experience. Calibration, uncertainty, timing, and recovery behavior matter just as much as the raw predictions. A brief glance should not produce a dramatic reaction, and a smooth animation cannot compensate for an unstable attention signal.

We also learned how much architecture affects performance. Sharing one camera pipeline across the extension was more valuable than adding more visual complexity. Constraints around privacy, memory, and browser permissions helped us make clearer design decisions.

Finally, the pivot taught us that a small character can make feedback feel personal. Eyzon's expressions and voice give a technical signal a playful meaning that a progress bar alone cannot provide.

## What's next for Eyzon-me

Our next priority is testing with real users across different webcams, lighting conditions, glasses, and working positions. We want to improve calibration reliability and compare the current gaze mapping with dedicated open-source screen-gaze tools before making stronger accuracy claims.

We also want to replace the placeholder art with Eyzon's own sprite set, expand idle and reaction animations, and offer more control over voice, motion, and reminder intensity. A simpler installation process would make the extension easier to try outside the development environment.

Longer term, we would explore optional task-aware dialogue and companion personalization while keeping camera processing local and giving users clear control over any external services.
