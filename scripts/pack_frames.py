"""Convert the source PNG sequences into individual web-ready frames.

Frames are written one file each, at the source's native 1280x720 — no sprite
sheets. A sheet big enough to hold a sequence at this resolution would be far
past what a browser will decode in one image, and downscaling to fit read as
blur on a full-bleed stage.

Two sets are written per sequence: full size, and a half-size set the runtime
picks up on small screens and low-DPR displays.

  awaken   the source sits on a near-white background, but the section is
           dark, so the background is keyed out to the page's ink.
  monarch  original framing, kept as shot.

Both sequences get the generator's corner watermark painted out.
"""
import glob, json, os, shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(os.path.dirname(ROOT), "_raw")
OUT = os.path.join(ROOT, "public", "frames")

QUALITY = 86
INK = np.array([0.02, 0.03, 0.06])

# the generator stamps a sparkle into the bottom-right of every frame
WATERMARK = (1125, 552, 1214, 648)
PATCH_DX = -140          # a clean stretch of the same background, to its left


def hide_watermark(im):
    """Paint over the generator's corner sparkle with nearby background."""
    x0, y0, x1, y1 = WATERMARK
    if im.size != (1280, 720):
        return im
    patch = im.crop((x0 + PATCH_DX, y0, x1 + PATCH_DX, y1))

    # feather the patch edges so the repair leaves no visible rectangle
    w, h = patch.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rectangle((6, 6, w - 7, h - 7), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(5))

    out = im.copy()
    out.paste(patch, (x0, y0), mask)
    return out


def load(path):
    return hide_watermark(Image.open(path).convert("RGB"))


def key_background(im):
    """Replace the near-white backdrop with the page's ink."""
    a = np.asarray(im).astype(np.float32) / 255
    mx = a.max(2)
    mn = a.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)

    # background is bright and desaturated *and* connected to the frame edge,
    # which keeps bright skin highlights from being punched out
    hard = (mx > 0.66) & (sat < 0.13)
    lab, _ = ndimage.label(hard)
    edge = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    edge.discard(0)
    sel = np.isin(lab, list(edge)).astype(np.float32)

    bg = np.clip(ndimage.gaussian_filter(sel, 2.2), 0, 1)[..., None]
    return Image.fromarray(
        (np.clip(a * (1 - bg) + INK * bg, 0, 1) * 255).astype(np.uint8)
    )


def write(frames, name):
    """Write a sequence as individual webp files, full and half size."""
    full = os.path.join(OUT, name)
    half = os.path.join(OUT, name + "-half")
    for d in (full, half):
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d)

    w, h = frames[0].size
    bytes_full = bytes_half = 0
    for i, im in enumerate(frames):
        p = os.path.join(full, f"{i:03d}.webp")
        im.save(p, "WEBP", quality=QUALITY, method=5)
        bytes_full += os.path.getsize(p)

        q = os.path.join(half, f"{i:03d}.webp")
        im.resize((w // 2, h // 2), Image.LANCZOS).save(
            q, "WEBP", quality=QUALITY, method=5
        )
        bytes_half += os.path.getsize(q)

    print(f"  {len(frames)} frames  {w}x{h}  {bytes_full/1e6:.1f} MB"
          f"   (half {w//2}x{h//2}  {bytes_half/1e6:.1f} MB)")

    with open(os.path.join(OUT, f"{name}.json"), "w") as fh:
        json.dump({"name": name, "count": len(frames), "w": w, "h": h}, fh, indent=2)


def build_awaken():
    files = sorted(glob.glob(os.path.join(RAW, "use_fff_background_and_x__frames", "*.png")))
    write([key_background(load(f)) for f in files], "awaken")


def build_monarch():
    files = sorted(glob.glob(os.path.join(RAW, "can_you_make_one_where_jin_woo_frames", "*.png")))
    # the closing frames cut to a much tighter shot, which reads as a glitch
    write([load(f) for f in files[:77]], "monarch")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in (("awaken", build_awaken), ("monarch", build_monarch)):
        print(name + ":")
        fn()
