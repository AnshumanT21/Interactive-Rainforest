"""Turn the raw Gemini images in assets-raw/ into web-ready files in public/assets/.

  plates   p*.jpg, 01/02 -> public/assets/plates/*.webp (the "-clean" version wins)
  birds    b*.jpg, f-*.jpg -> background removed, cropped -> public/assets/birds/*.webp
  clouds   c*.jpg (white cloud on black) -> luminance alpha -> public/assets/clouds/*.webp

Run from the project root:  tools/.venv/Scripts/python tools/process_assets.py [--only name ...]
Already-processed files are skipped unless the source is newer.
"""
import sys
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets-raw"
OUT = ROOT / "public" / "assets"

PLATE_W = 2560      # background plates
BIRD_MAX = 1400     # longest side of a cut-out
CLOUD_W = 1800


def fresh(src: Path, dst: Path) -> bool:
    return dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime


def plates(only):
    out = OUT / "plates"
    out.mkdir(parents=True, exist_ok=True)
    names = {}
    for src in sorted(RAW.glob("*.jpg")):
        stem = src.stem
        if not (stem.startswith("p") or stem[:2] in ("01", "02")) or stem.startswith("prompt"):
            continue
        base = stem.removesuffix("-clean")
        # the cleaned version (birds removed) replaces the original
        if stem == base and (RAW / f"{base}-clean.jpg").exists():
            continue
        names[base] = src
    for base, src in names.items():
        if only and base not in only:
            continue
        dst = out / f"{base}.webp"
        if fresh(src, dst):
            continue
        im = Image.open(src).convert("RGB")
        im = im.resize((PLATE_W, round(im.height * PLATE_W / im.width)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=82, method=6)
        im.resize((1280, round(im.height * 1280 / im.width)), Image.LANCZOS).save(
            out / f"{base}-sm.webp", "WEBP", quality=80, method=6)
        print("plate", dst.name, "from", src.name)


_session = None


def cutout(im):
    """AI matte for the bird (great feathers) unioned with a colour key against
    the grey studio backdrop (keeps the branch, which the AI matte drops)."""
    global _session
    import numpy as np
    from rembg import new_session, remove
    if _session is None:
        _session = new_session("isnet-general-use")
    ai = np.asarray(remove(im, session=_session, post_process_mask=True).getchannel("A"), dtype=np.float32) / 255

    rgb = np.asarray(im, dtype=np.float32)
    h, w, _ = rgb.shape
    # model the backdrop as a smooth quadratic gradient fitted to pixels the AI called background
    ys, xs = np.nonzero(ai < 0.02)
    pick = np.random.default_rng(0).choice(len(xs), size=min(20000, len(xs)), replace=False)
    xs, ys = xs[pick] / w, ys[pick] / h
    A = np.stack([np.ones_like(xs), xs, ys, xs * xs, ys * ys, xs * ys], 1)
    coef, *_ = np.linalg.lstsq(A, rgb[(ys * h).astype(int), (xs * w).astype(int)], rcond=None)
    gx, gy = np.meshgrid(np.arange(w) / w, np.arange(h) / h)
    G = np.stack([np.ones_like(gx), gx, gy, gx * gx, gy * gy, gx * gy], -1)
    bg = G @ coef
    # The backdrop's vignette and glow vary mostly in brightness, while branches
    # differ in hue (brown, moss), so brightness differences count for less.
    diff = rgb - bg
    lum = diff.mean(-1, keepdims=True)
    dist = np.sqrt((np.linalg.norm(diff - lum, axis=-1) * 1.6) ** 2 + (lum[..., 0] * 0.45) ** 2)
    key = np.clip((dist - 18) / 22, 0, 1)
    # drop speckle: open the key (erode then dilate) before trusting it
    k = Image.fromarray((key * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    key = np.minimum(key, np.asarray(k, dtype=np.float32) / 255)

    alpha = np.maximum(ai, key)
    out = im.convert("RGBA")
    out.putalpha(Image.fromarray((alpha * 255).astype(np.uint8)))
    return out, Image.fromarray((ai * 255).astype(np.uint8))


def drop_islands(mask, keep=0.04):
    """Remove small disconnected specks (twig fragments the matte half-kept):
    any blob smaller than `keep` x the biggest one is erased."""
    import numpy as np
    from collections import deque
    small = mask.resize((mask.width // 4, mask.height // 4), Image.BILINEAR)
    on = np.asarray(small) > 40
    h, w = on.shape
    label = np.zeros((h, w), np.int32)
    sizes = [0]
    for y in range(h):
        for x in range(w):
            if on[y, x] and not label[y, x]:
                n = len(sizes)
                label[y, x] = n
                q, count = deque([(y, x)]), 0
                while q:
                    cy, cx = q.popleft()
                    count += 1
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < h and 0 <= nx < w and on[ny, nx] and not label[ny, nx]:
                            label[ny, nx] = n
                            q.append((ny, nx))
                sizes.append(count)
    biggest = max(sizes)
    keep_ids = [i for i, s in enumerate(sizes) if i and s >= biggest * keep]
    keep_small = np.isin(label, keep_ids).astype(np.uint8) * 255
    k = Image.fromarray(keep_small).filter(ImageFilter.MaxFilter(5)).resize(mask.size, Image.BILINEAR)
    return Image.fromarray(np.minimum(np.asarray(mask), np.asarray(k)))


def birds(only):
    out = OUT / "birds"
    out.mkdir(parents=True, exist_ok=True)
    for src in sorted(list(RAW.glob("b*.jpg")) + list(RAW.glob("f-*.jpg"))):
        if only and src.stem not in only:
            continue
        dst = out / f"{src.stem}.webp"
        if fresh(src, dst):
            continue
        rgba, mask = cutout(Image.open(src).convert("RGB"))
        if src.stem.startswith("b"):
            # Perched birds drop their studio branch: on the site they sit on
            # a real branch in the background photo, so only the bird is kept.
            mask = drop_islands(mask)
            rgba.putalpha(mask)
        # soften the matte edge by a hair so feathers don't look scissor-cut
        a = rgba.getchannel("A").filter(ImageFilter.GaussianBlur(0.6))
        rgba.putalpha(a)
        box = a.point(lambda v: 255 if v > 8 else 0).getbbox()
        # flight frames are cross-faded, so they keep the shared square frame
        flap_frame = src.stem.startswith("f-") and src.stem != "f-budgie-flock"
        if box and not flap_frame:
            pad = 12
            box = (max(0, box[0] - pad), max(0, box[1] - pad),
                   min(rgba.width, box[2] + pad), min(rgba.height, box[3] + pad))
            rgba = rgba.crop(box)
            mask = mask.crop(box)
        s = min(1, BIRD_MAX / max(rgba.size))
        if s < 1:
            rgba = rgba.resize((round(rgba.width * s), round(rgba.height * s)), Image.LANCZOS)
        rgba.save(dst, "WEBP", quality=88, method=6)
        # bird-only matte (no branch), small and soft: the shader animates
        # only what's inside it, so the branch stays put while the bird moves
        m = mask.resize((max(8, rgba.width // 4), max(8, rgba.height // 4)), Image.LANCZOS)
        m.filter(ImageFilter.GaussianBlur(3)).save(out / f"{src.stem}-mask.webp", "WEBP", quality=80)
        print("bird", dst.name, rgba.size)


def clouds(only):
    out = OUT / "clouds"
    out.mkdir(parents=True, exist_ok=True)
    for src in sorted(RAW.glob("c[0-9]*.jpg")):
        if only and src.stem not in only:
            continue
        dst = out / f"{src.stem}.webp"
        if fresh(src, dst):
            continue
        im = Image.open(src).convert("RGB")
        im = im.resize((CLOUD_W, round(im.height * CLOUD_W / im.width)), Image.LANCZOS)
        r, g, b = im.split()
        # brightness becomes coverage; un-premultiply so the colour stays cloud-white
        alpha = Image.eval(Image.merge("RGB", (r, g, b)).convert("L"), lambda v: min(255, max(0, (v - 6) * 1.25)))
        px_rgb, px_a = im.load(), alpha.load()
        rgba = Image.new("RGBA", im.size)
        px = rgba.load()
        for y in range(im.height):
            for x in range(im.width):
                a = px_a[x, y]
                if a == 0:
                    px[x, y] = (255, 255, 255, 0)
                    continue
                cr, cg, cb = px_rgb[x, y]
                k = 255 / a
                # thin edges un-premultiply into noisy orange; ease them toward cloud white
                w = (a / 255) ** 0.6
                ur, ug, ub = min(255, cr * k), min(255, cg * k), min(255, cb * k)
                px[x, y] = (int(ur * w + 246 * (1 - w)), int(ug * w + 242 * (1 - w)), int(ub * w + 236 * (1 - w)), a)
        rgba.save(dst, "WEBP", quality=85, method=6)
        print("cloud", dst.name)


if __name__ == "__main__":
    args = sys.argv[1:]
    only = set(args[args.index("--only") + 1:]) if "--only" in args else set()
    plates(only)
    clouds(only)
    birds(only)
