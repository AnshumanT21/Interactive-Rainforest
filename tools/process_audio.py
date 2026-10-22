"""Pull the soundtrack out of each Veo clip in prompts/Videos/ and make two files:

  public/assets/audio/vNN-name-amb.mp3   the whole soundtrack as a seamless loop (the stop's ambience)
  public/assets/audio/vNN-name-call.mp3  the loudest ~2 s moment (usually the bird calling), for taps

Levels are evened out so no stop is much louder than another.
Run from the project root:  tools/.venv/Scripts/python tools/process_audio.py
"""
import subprocess
from pathlib import Path

import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "prompts" / "Videos"
OUT = ROOT / "public" / "assets" / "audio"
FF = imageio_ffmpeg.get_ffmpeg_exe()
RATE = 44100


def name_of(p: Path) -> str:
    n = p.name
    while n.lower().endswith(".mp4"):
        n = n[:-4]
    return n


def decode(path):
    raw = subprocess.run([FF, "-v", "error", "-i", str(path), "-vn", "-ac", "2", "-ar", str(RATE),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def encode(path, audio, kbps):
    subprocess.run([FF, "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", "2", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", f"{kbps}k", str(path)],
                   input=np.ascontiguousarray(audio, np.float32).tobytes(), check=True)


def rms(x):
    return float(np.sqrt(np.mean(x ** 2)) + 1e-9)


def fades(x, s_in, s_out):
    x = x.copy()
    a, b = int(s_in * RATE), int(s_out * RATE)
    if a:
        x[:a] *= np.linspace(0, 1, a)[:, None]
    if b:
        x[-b:] *= np.linspace(1, 0, b)[:, None]
    return x


def loop(x, blend_s=1.5):
    """Equal-power cross-fade of the tail into the head, so it repeats seamlessly."""
    k = int(blend_s * RATE)
    t = np.linspace(0, np.pi / 2, k)[:, None]
    head = x[:k] * np.sin(t) + x[-k:] * np.cos(t)
    return np.concatenate([head, x[k:-k]])


def loudest(x, win_s=2.2):
    """Start of the window with the most energy, measured in 50 ms steps."""
    hop, win = int(0.05 * RATE), int(win_s * RATE)
    e = np.convolve((x ** 2).mean(1), np.ones(hop), "valid")[::hop]
    w = max(1, win // hop)
    s = np.convolve(e, np.ones(w), "valid")
    return int(s.argmax()) * hop, win


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(SRC.glob("*.mp4")):
        name = name_of(src)
        amb_path, call_path = OUT / f"{name}-amb.mp3", OUT / f"{name}-call.mp3"
        if amb_path.exists() and amb_path.stat().st_mtime >= src.stat().st_mtime:
            continue
        x = decode(src)
        if len(x) < RATE:
            print(name, "has no usable audio")
            continue
        # ambience: aim every stop at the same average level, cap peaks
        amb = loop(x) * (0.08 / rms(x))
        amb = np.tanh(amb * 1.2) / 1.2
        encode(amb_path, amb, 112)
        # the call: loudest moment, a touch louder than the bed, soft edges
        start, win = loudest(x)
        call = fades(x[start:start + win], 0.04, 0.4)
        call = call * (0.25 / rms(call))
        call = np.clip(call, -0.98, 0.98)
        encode(call_path, call, 128)
        print(name, f"amb {len(amb) / RATE:.1f}s, call at {start / RATE:.1f}s")


if __name__ == "__main__":
    main()
