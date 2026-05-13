# App icon & splash assets

Drop source images here, then run `npm run assets:generate` to produce every Android icon density and adaptive-icon layer automatically.

## Required file

- **`icon.png`** — 1024 × 1024, PNG, no transparency. This is the app launcher icon source. The generator handles all density downscales (mdpi → xxxhdpi) and round/adaptive variants.

## Optional files

- **`icon-foreground.png`** — 1024 × 1024 PNG with transparency. Used as the foreground layer of the Android adaptive icon (Android 8+). Keep important content inside the centre 66% — the outer ring is masked by the OS. If omitted, `icon.png` is used.
- **`icon-background.png`** — 1024 × 1024 PNG. Background layer of the adaptive icon. If omitted, a solid white background is used.
- **`splash.png`** — 2732 × 2732 PNG. Splash screen. The generator centres this in a 2732-square canvas and crops per device.

## Workflow

1. Place `icon.png` (and optionally the foreground / background / splash) in this folder.
2. Run `npm run assets:generate` from the project root.
3. Run `npx cap sync android` to copy the generated resources into the Android project.
4. Rebuild the APK.

The generator writes into `android/app/src/main/res/mipmap-*/` and overwrites the default Capacitor placeholders.
