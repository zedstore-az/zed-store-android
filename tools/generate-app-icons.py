from pathlib import Path
import cairosvg
from PIL import Image
import io

root = Path(__file__).resolve().parents[1]
svg = root / "zedstore-management" / "electron" / "icon.svg"
data = svg.read_bytes()
# Windows app icon
png = cairosvg.svg2png(bytestring=data, output_width=256, output_height=256)
im = Image.open(io.BytesIO(png)).convert("RGBA")
(root / "zedstore-management" / "electron").mkdir(parents=True, exist_ok=True)
im.save(root / "zedstore-management" / "electron" / "icon.png")
im.save(root / "zedstore-management" / "electron" / "icon.ico", format="ICO", sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
# Android legacy launcher density assets
project = root / "project"
res_dirs = list(project.rglob("src/main/res"))
if not res_dirs:
    raise SystemExit("Android res directory not found")
for res in res_dirs:
    for folder, size in [("mipmap-mdpi",48),("mipmap-hdpi",72),("mipmap-xhdpi",96),("mipmap-xxhdpi",144),("mipmap-xxxhdpi",192)]:
        out = res / folder
        out.mkdir(parents=True, exist_ok=True)
        icon = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=data, output_width=size, output_height=size))).convert("RGBA")
        icon.save(out / "ic_launcher.png")
        icon.save(out / "ic_launcher_round.png")
    # Android adaptive foreground and solid background for modern launchers
    any_mipmap = res / "mipmap-xxxhdpi"
    any_mipmap.mkdir(parents=True, exist_ok=True)
    Image.open(io.BytesIO(cairosvg.svg2png(bytestring=data, output_width=432, output_height=432))).convert("RGBA").save(any_mipmap / "ic_launcher_foreground.png")
print("Generated ZED STORE Android and Windows launcher icons.")
