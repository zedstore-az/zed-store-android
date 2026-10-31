from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
# Use the exact logo image supplied by the user. Do not redraw, recolor, crop,
# add effects, or replace it with a simplified mark.
SOURCE = ROOT / "zedstore-management" / "public" / "Picsart_26-10-14_20-57-41-838.png"

if not SOURCE.exists():
    raise FileNotFoundError(f"User-provided ZED STORE icon not found: {SOURCE}")

original = Image.open(SOURCE).convert("RGBA")

# The supplied artwork is intended as a square app icon. If its dimensions
# differ, fit it onto a square canvas without cropping or changing the design.
side = max(original.width, original.height)
if original.width != original.height:
    background = Image.new("RGBA", (side, side), (0, 0, 0, 255))
    x = (side - original.width) // 2
    y = (side - original.height) // 2
    background.alpha_composite(original, (x, y))
    original = background

def make_icon(size):
    return original.resize((size, size), Image.Resampling.LANCZOS)

# Desktop / PC app icon
desktop = ROOT / "zedstore-management" / "electron"
desktop.mkdir(parents=True, exist_ok=True)
make_icon(1024).save(desktop / "icon.png")
make_icon(256).save(
    desktop / "icon.ico",
    format="ICO",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)

# PWA icons for Android Chrome and desktop browsers
public = ROOT / "zedstore-management" / "public"
make_icon(192).save(public / "app-icon-192.png")
make_icon(512).save(public / "app-icon-512.png")

# Android launcher assets — same exact user-supplied artwork
res = ROOT / "android-app" / "app" / "src" / "main" / "res"
if res.exists():
    for folder, size in [
        ("mipmap-mdpi", 48),
        ("mipmap-hdpi", 72),
        ("mipmap-xhdpi", 96),
        ("mipmap-xxhdpi", 144),
        ("mipmap-xxxhdpi", 192),
    ]:
        out = res / folder
        out.mkdir(parents=True, exist_ok=True)
        icon = make_icon(size)
        icon.save(out / "ic_launcher.png")
        icon.save(out / "ic_launcher_round.png")
    make_icon(432).save(res / "mipmap-xxxhdpi" / "ic_launcher_foreground.png")

print("Generated Android, PC, and PWA icons from the exact user-supplied ZED STORE image.")
