"""Turn the Veo clips in prompts/Videos/ into seamless web loops in public/assets/video/.

  vNN-name.mp4  ->  public/assets/video/vNN-name.mp4      (1920 wide, desktop)
                    public/assets/video/vNN-name-sm.mp4   (1280 wide, phones)
                    public/assets/video/vNN-name.webp     (first frame, shown while the video loads)

Looping: the last second of the clip is cross-faded into its first second, so
the loop's end runs straight into its start with no jump. The result is one
second shorter than the source. Audio is dropped (the site has its own sound).

Run from the project root:  tools/.venv/Scripts/python tools/process_videos.py
"""
from pathlib import Path

import imageio.v3 as iio
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "prompts" / "Videos"
OUT = ROOT / "public" / "assets" / "video"
BLEND_S = 0.75


def name_of(p: Path) -> str:
    # files arrive as "v02-toucan.mp4.mp4"
    n = p.name
    while n.lower().endswith(".mp4"):
        n = n[:-4]
    return n


def best_loop(frames, fps):
    """Pick where the loop starts and ends: the pair of frames (one near the
    start, one near the end, at least 6 s apart) that look most alike, so the
    cross-fade between them doesn't show a ghosted double bird."""
    n = len(frames)
    small = [np.asarray(Image.fromarray(f).resize((96, 54), Image.BILINEAR), dtype=np.float32) for f in frames]
    reach = int(2 * fps)
    best = (np.inf, 0, n - 1)
    for a in range(0, min(reach, n)):
        for b in range(max(a + int(6 * fps), n - reach), n):
            d = float(np.abs(small[a] - small[b]).mean())
            if d < best[0]:
                best = (d, a, b)
    return best


def loop_frames(frames, fps):
    d, a, b = best_loop(frames, fps)
    frames = frames[a:b + 1]
    k = int(round(BLEND_S * fps))
    n = len(frames)
    out = []
    for j in range(n - k):
        if j < k:
            t = (j + 0.5) / k
            t = t * t * (3 - 2 * t)
            f = frames[n - k + j].astype(np.float32) * (1 - t) + frames[j].astype(np.float32) * t
            out.append(np.clip(f + 0.5, 0, 255).astype(np.uint8))
        else:
            out.append(frames[j])
    print(f"  loop {a}..{b} (match {d:.1f})")
    return out


def resize(frames, width):
    h0, w0 = frames[0].shape[:2]
    height = int(round(h0 * width / w0 / 2)) * 2
    if (w0, h0) == (width, height):
        return frames
    return [np.asarray(Image.fromarray(f).resize((width, height), Image.LANCZOS)) for f in frames]


def write(path, frames, fps, crf):
    iio.imwrite(path, np.stack(frames), extension=".mp4", plugin="pyav", codec="libx264", fps=fps,
                out_pixel_format="yuv420p") if False else _write_ffmpeg(path, frames, fps, crf)


def _write_ffmpeg(path, frames, fps, crf):
    import imageio_ffmpeg
    h, w = frames[0].shape[:2]
    gen = imageio_ffmpeg.write_frames(
        str(path), (w, h), fps=fps, codec="libx264", pix_fmt_out="yuv420p", quality=None,
        output_params=["-crf", str(crf), "-preset", "slow", "-movflags", "+faststart", "-an"],
        macro_block_size=2)
    gen.send(None)
    for f in frames:
        gen.send(np.ascontiguousarray(f))
    gen.close()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(SRC.glob("*.mp4")):
        name = name_of(src)
        dst = OUT / f"{name}.mp4"
        if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
            continue
        fps = iio.immeta(src).get("fps", 24)
        frames = [f for f in iio.imiter(src)]
        looped = loop_frames(frames, fps)
        big = resize(looped, 1920)
        _write_ffmpeg(dst, big, fps, crf=19)
        _write_ffmpeg(OUT / f"{name}-sm.mp4", resize(looped, 1280), fps, crf=24)
        Image.fromarray(big[0]).save(OUT / f"{name}.webp", "WEBP", quality=82)
        print(name, f"{len(frames)} -> {len(looped)} frames", f"{dst.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
