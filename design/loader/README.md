# Painted sun replacement

Only the procedural sun is replaced. The original hero-aligned eclipse coordinates and resize tracking, gold-dust energy accumulation, side banners, corner figures, category/title sequence, wordmark, divider, iris handoff, and five-second timing remain unchanged.

The painted sun's central disc fits the original moon. The moon completes its crossing at 2.65 seconds; then the painted sun and its rays shrink behind it over 0.8 seconds. The original landing-scene artwork handles the final eclipse handoff. SVG turbulence, rotating noise, blending and procedural corona layers have been removed from the sun.

The loader wordmark follows the actual landing wordmark's rendered bounds, including responsive scaling and font-driven offsets. Resize/load observers follow the mobile node replacement during hydration and clean up when the loader exits. Browser measurements at 390 × 844, 768 × 1024, and 1280 × 800 match within 0.02 CSS pixels. Review captures are in `review/`.

## Generated asset

- `painted-sun-source-v1.png`: transparent source created using the built-in ImageGen tool.
- `painted-sun-prompt.txt`: exact generation prompt.
- `../../client/public/assets/opt/loader/painted-sun-v1.webp`: 768px production copy with alpha preserved.

Replay locally using `http://localhost:3000/?loader`. Real iPhone Safari verification is still required; the device that showed the original sun-rendering bug was unavailable during implementation.
