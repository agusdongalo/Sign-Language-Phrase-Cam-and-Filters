# Sign-Language-Phrase-Cam-and-Filters

Real-time webcam application that switches privacy filters and sign-mode actions using hand gestures detected with MediaPipe.

The project is built around a single Python entry point, `app.py`, and combines:

- MediaPipe Hands for gesture recognition
- MediaPipe Selfie Segmentation for person/background separation
- MediaPipe Face Detection for face-region effects
- OpenCV for webcam capture, rendering, and image processing

## What It Does

The app opens your webcam feed, mirrors it like a front-facing camera, and continuously interprets visible hand gestures. Based on the recognized gesture, it can:

- leave the image untouched
- blur the background
- pixelate the entire frame
- blur detected faces
- pixelate the detected hand region
- replace the background with a local image
- enter a sign-recognition mode for a small phrase demo

To reduce flicker, gesture switching uses a short history buffer and only changes modes when the same gesture appears consistently across recent frames.

## Features

- Real-time gesture-driven privacy modes
- Stable gesture detection using majority voting over recent frames
- Background blur using segmentation masks
- Face blur using MediaPipe face detection
- Hand-only pixelation
- Local background image replacement from the `backgrounds/` folder
- Sign mode with phrase sequencing and on-screen word output
- Live overlay showing active mode, FPS, and sign/background status

## Requirements

- Windows
- Python 3.11
- Webcam

## Why Python 3.11

This project uses `mediapipe==0.10.11` and the classic `mp.solutions.*` APIs. In practice, this setup is most reliable on Python 3.11 for this project. If you try newer Python versions and MediaPipe wheels are missing or incompatible, use Python 3.11.

## Project Structure

- `app.py` - main application
- `backgrounds/` - optional local images used for background replacement
- `README.md` - project documentation

## Installation

From PowerShell:

```powershell
cd C:\xampp\htdocs\GestureControlledPrivacyMode
py -3.11 -m venv .venv311
.\.venv311\Scripts\python.exe -m pip install --upgrade pip
.\.venv311\Scripts\python.exe -m pip install opencv-python mediapipe==0.10.11 numpy
```

If `py -3.11` is not available, check installed Python versions:

```powershell
py -0p
```

Then either install Python 3.11 or point the commands above at an existing Python 3.11 interpreter.

## Run

```powershell
cd C:\xampp\htdocs\GestureControlledPrivacyMode
.\.venv311\Scripts\python.exe app.py
```

The app opens a window named `Gesture Controlled Privacy Mode`.

Exit with:

- `Q`
- `Esc`

## How Mode Switching Works

The app does not switch modes on a single frame. It stores a rolling gesture history and only accepts a gesture as stable when it appears often enough in the recent buffer.

Current implementation details:

- history buffer size: `8` frames
- minimum stable count: `5` frames
- minimum ratio: `60%`
- mode switch cooldown: `0.0` seconds

That means gestures should usually be held briefly and clearly to trigger reliably.

## Privacy Modes

The app starts in `CLEAR` mode.

### Standard Gesture Map

| Gesture | Result |
| --- | --- |
| Fist | `CLEAR` |
| Open Palm | `BG BLUR` |
| Peace Sign | `PIXELATE` |
| Three Fingers | `FACE BLUR` |
| Middle Finger | `HAND PIXEL` |
| Index Finger | `SIGN` |

### Mode Descriptions

#### `CLEAR`

Shows the normal webcam feed with no privacy effect applied.

#### `BG BLUR`

Uses selfie segmentation to keep the subject visible while blurring the background.

#### `PIXELATE`

Pixelates the entire frame by downscaling and re-upscaling the image.

#### `FACE BLUR`

Detects faces and applies blur only to face bounding boxes.

#### `HAND PIXEL`

Finds the active hand landmarks and pixelates only the hand region.

#### `BG IMAGE`

Replaces the segmented background with one of the local images from `backgrounds/`.

#### `SIGN`

Disables normal gesture-based mode switching and instead interprets a separate set of sign-oriented hand patterns and phrase sequences.

## Background Image Mode

Background replacement depends on image files being available in `backgrounds/`.

Supported extensions:

- `.jpg`
- `.jpeg`
- `.png`
- `.bmp`

The app loads every valid image in sorted filename order.

### Enter Background Selection

Show both fists and hold for about `2` seconds.

When background selection activates:

- the mode becomes `BG IMAGE`
- the app keeps the current selected background index
- the overlay can show `BG SELECT: x/n`

### Browse Backgrounds

While in background selection mode:

- open right palm once to move to the next background
- open left palm once to move to the previous background

This is edge-triggered, so you need to close and re-open the hand to step again.

### Exit Background Selection

Show both fists again for about `2` seconds.

The selected background remains active after leaving selection mode.

## Sign Mode

Show an index finger to enter `SIGN` mode.

While sign mode is active:

- normal privacy-mode gesture switching is paused
- sign words may appear as an on-screen message
- the mode stays active until explicitly exited

### Exit Sign Mode

Show a middle finger on either hand to return to `CLEAR`.

## Sign Gestures and Phrases

Sign mode supports:

- an `I LOVE YOU` gesture
- Phrase A: `Hello -> I'm -> Don`
- Phrase B: `What -> Is -> Your -> Name?`

### Sign Outputs

| Pattern / Gesture | Output |
| --- | --- |
| Rock-n-roll gesture | `I LOVE YOU` |
| Open palm facing camera | `Hello` or `Your` depending on sequence state |
| Index pointing to chest area | `I'm` or `Is` depending on sequence state |
| Pinky-only gesture | `Don` |
| Palm-up open hand | `What` |
| Two index fingers facing each other | `Name?` |

### Sequence Timing Rules

Current timing-related behavior in the code:

- sequence step timeout: about `5` seconds
- grace window after `Hello` for `I'm`: about `5` seconds
- grace window after `I'm` for `Don`: about `5` seconds
- grace window after `What` for `Is`: about `5` seconds
- grace window after `Is` for `Your`: about `5` seconds

If too much time passes between steps, the phrase sequence resets.

### Rock Gesture Behavior

`I LOVE YOU` uses a short smoothing buffer in sign mode so the label is less likely to flicker.

## On-Screen UI

The webcam window includes:

- `Mode: ...` at the top-left
- `FPS: ...` at the bottom-left
- optional `BG SELECT: x/n` status when selecting a background
- optional centered message near the bottom for sign outputs

## Test Checklist

Use this checklist after setup:

1. Launch the app and confirm the webcam window opens.
2. Confirm the overlay starts with `Mode: CLEAR`.
3. Confirm FPS is visible in the lower-left corner.
4. Hold a fist briefly and verify the mode stays `CLEAR`.
5. Hold an open palm and verify `BG BLUR`.
6. Hold a peace sign and verify `PIXELATE`.
7. Hold three fingers and verify `FACE BLUR`.
8. Hold a middle finger and verify `HAND PIXEL`.
9. Hold an index finger and verify entry into `SIGN`.
10. In sign mode, show rock-n-roll and verify `I LOVE YOU`.
11. In sign mode, show middle finger and verify exit to `CLEAR`.
12. If `backgrounds/` contains images, hold both fists for about 2 seconds and verify background selection starts.
13. In background selection mode, open the right palm to move forward.
14. Open the left palm to move backward.
15. Hold both fists again for about 2 seconds and verify selection mode exits while the chosen background remains active.
16. In sign mode, try `Hello -> I'm -> Don`.
17. In sign mode, try `What -> Is -> Your -> Name?`

## Troubleshooting

### Webcam does not open

1. Close apps that may already be using the camera, such as Zoom, Teams, Discord, or a browser tab.
2. Check Windows camera permissions:
   `Settings -> Privacy & Security -> Camera`
3. Run a quick OpenCV camera check:

```powershell
.\.venv311\Scripts\python.exe -c "import cv2; cap=cv2.VideoCapture(0); print('opened', cap.isOpened()); ret, frame = cap.read(); print('frame', ret); cap.release()"
```

If it prints `opened False`, the camera index may be wrong or another process is locking the camera.

### Wrong camera index

If your webcam is not device `0`, edit `app.py` and change:

```python
cap = cv2.VideoCapture(0)
```

Try values like `1` or `2`.

### MediaPipe installation issues

If `mediapipe` fails to install or import:

- confirm you are using Python 3.11
- recreate the virtual environment
- reinstall the packages in a clean environment

### Gestures are unstable

Try the following:

- improve room lighting
- keep your hand fully inside the frame
- hold the gesture for a little longer
- avoid cluttered backgrounds
- keep the webcam at chest or face height

### Background replacement looks rough

This app uses person segmentation, so quality depends on:

- lighting
- camera quality
- subject/background contrast
- motion blur

Plain backgrounds and even lighting usually improve results.

## Implementation Notes

- The video frame is mirrored with `cv2.flip(frame, 1)`, so movement feels natural like a selfie camera.
- Handedness can vary, so the app also uses x-position ordering when two hands are visible for more stable left/right handling.
- Background image mode only works when `backgrounds/` contains at least one readable image.
- Face-dependent sign logic can fall back to approximate chest-zone coordinates if no face box is detected.

## Future Improvement Ideas

- configurable gesture bindings
- adjustable blur and pixelation strength
- camera source selection from the UI
- more sign vocabulary
- screenshot or recording support
- packaging as a desktop executable

## License

No license file is currently included in this repository. Add one if you plan to distribute or reuse the project outside personal/internal use.
