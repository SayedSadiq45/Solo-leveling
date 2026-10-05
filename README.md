# 覚醒 | Solo Leveling

<p align="center">
  <strong>A cinematic three-act scroll experience inspired by the awakening of a monarch.</strong>
</p>

<p align="center">
  <a href="https://solo-leveling-sayed-sadiq.vercel.app/">Live Website</a>
  ·
  <a href="https://github.com/SayedSadiq45/solo-leveling">Repository</a>
  ·
  <a href="LICENSE">MIT License</a>
</p>

Built by [Sayed Sadiq](https://github.com/SayedSadiq45) with React and Vite. The experience turns scroll, pointer movement, canvas rendering, and layered visual effects into one continuous transformation from human to monarch.

## Experience it

**[Open the live website](https://solo-leveling-sayed-sadiq.vercel.app/)**

Move through the three acts, drag across the Shadow Monarch scene, and move your pointer across the final portrait to reveal the awakened form. Reduced-motion preferences are respected throughout the experience.

```bash
npm install
npm run dev      # dev server
npm run build    # production build -> dist/
```

## The three sections

| # | Section | Interaction |
|---|---------|-------------|
| 01 | **覚醒 / AWAKEN** | Dark stage, pinned. Scrolling scrubs an 80-frame sequence: eyes closed → open → the blue monarch glow. The title's glow and the edge meter track the same progress value. |
| 02 | **影の君主 / SHADOW MONARCH** | Pointer X maps onto the dragon's tracked *position*, so sweeping left-to-right drags it across and centre puts it centre. Carries the falling-glyph rain and the reactbits fluid **SplashCursor**, which mounts only while the section is on screen. |
| 03 | **二つの顔 / ARISE** | Two stacked portraits, shown whole; a soft trailing lens follows the pointer and reveals the awakened image through the human one. Drifts on its own until the pointer arrives. |

A storm (`Thunder`) runs over all three sections, striking roughly twice a
second. It is disabled entirely under `prefers-reduced-motion`.

## Deploying

Pushed to `main`, GitHub Actions builds and publishes to GitHub Pages
(`.github/workflows/deploy.yml`). The site is served from a project path, so
`vite.config.js` sets `base` and runtime asset URLs are built from
`import.meta.env.BASE_URL` — relative paths alone would break on a deep link.

## Frames

```bash
python scripts/pack_frames.py     # reads ../_raw/, writes public/frames/
```

Each sequence is written as **individual webp files at the source's native
1280x720**, not a sprite sheet. A sheet large enough to hold a sequence at
this resolution is far past what a browser will decode in one image, and
shrinking one to fit read as blur on a full-bleed stage.

A half-size set is written alongside; the runtime picks it on small screens
and low-DPR displays. Full is ~7.8 MB across both sequences, half ~3.7 MB —
a visitor loads one or the other.

The packer also:

- **awaken** — keys out the near-white backdrop. Pixels that are bright,
  desaturated *and* connected to the frame edge become the page's ink, so the
  section can be dark without punching holes in his face.
- **both** — paints out the generator's corner sparkle with nearby background.
- **monarch** — drops the closing frames, which cut to a much tighter shot.

Frames stream in parallel and the canvas draws the nearest one that has
decoded, so a section is usable well before the last frame lands.

## Structure

```
src/
  lib/useAtlas.js      atlas loading + cell lookup
  lib/useInView.js     in-view + sticky-scroll progress
  components/
    FrameCanvas.jsx    eased frame renderer, shared by sections 01 and 02
    RevealStage.jsx    pointer-lens reveal for section 03
    GlyphRain.jsx      falling katakana
    SplashCursor.jsx   reactbits WebGL fluid cursor
scripts/
  pack_frames.py       PNG frames -> webp atlas
  shots*.mjs           headless screenshot checks
```

## Technical highlights

- Every canvas runs one rAF loop, pauses on `visibilitychange`, and honours
  `prefers-reduced-motion` by drawing a single static frame.
- The pointer maps onto `dragonX` rather than onto the frame index: the kept
  frames are unevenly spaced, so indexing directly would stall the dragon at
  one end and then race it across. Adjacent frames cross-fade, except across a
  large positional jump, which cuts instead of showing two dragons at once.
- A 16:9 frame cannot fill a portrait screen without cropping the subject away,
  so narrow viewports fit the frame to width and compose the type around it as
  a band.
- `scripts/pack_frames.py` reads the original PNG sequences from `../_raw/`,
  which is not in the repo — the packed atlases in `public/frames/` are what
  the app ships. You only need the raw frames to re-pack.

## Author

Created and maintained by **[Sayed Sadiq](https://github.com/SayedSadiq45)**.

- GitHub: [@SayedSadiq45](https://github.com/SayedSadiq45)
- LinkedIn: [Sayed Sadiq](https://www.linkedin.com/in/sayed-sadiq45/)

## License

This project is licensed under the [MIT License](LICENSE). The Solo Leveling artwork and characters remain the property of their respective rights holders.
