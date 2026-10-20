# Uma's Rainforest

A scroll-driven flight through a photo-real rainforest, made for Uma. The page opens inside the clouds; scrolling pushes through them to the canopy, then glides from bird to bird (11 species) down to a waterfall, with a short description beside each one.

Built with Three.js, GSAP ScrollTrigger and Lenis on Vite. The images were made with Gemini (Nano Banana Pro) and the moving scenes with Veo.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Add `?debug` to the URL for a frame-rate counter.

## How it's put together

- `src/journey.js` holds the stops (order, text side, framing, which photo or video), the camera path and the scroll timing.
- `src/content/birds.json` holds the bird names and descriptions. Edit the text here.
- `src/fx/` holds the effects: clouds, flying birds, butterflies, shaders and post-processing.
- `public/assets/` holds the web-ready images and videos the site loads.

## Adding new images and videos

The raw Gemini files live in `prompts/` (prompt sheets plus the `Batch 1–4` and `Videos` folders). Two scripts turn them into web assets:

```bash
python -m venv tools/.venv
tools/.venv/Scripts/python -m pip install "rembg[cpu]" pillow imageio imageio-ffmpeg
```

- **Images:** copy new images into `assets-raw/` (without the extra `.png` in the name), then run `tools/.venv/Scripts/python tools/process_assets.py`. It compresses the backgrounds, cuts the birds out of their grey studio backdrops and processes the clouds.
- **Videos:** put Veo clips in `prompts/Videos/` named like `v12-waterfall.mp4`, then run `tools/.venv/Scripts/python tools/process_videos.py`. It makes each one a seamless loop and compresses it for desktop and phones. Then add `video: 'v12-waterfall'` (and `videoX`, where the bird sits across the frame) to that stop in `src/journey.js`.
