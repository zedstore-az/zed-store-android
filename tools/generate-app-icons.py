from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SIZE = 1024
# Draw the geometric Z mark on a transparent canvas, with a blue-to-cyan gradient.
mask = Image.new("L", (SIZE, SIZE), 0)
d = ImageDraw.Draw(mask)
scale = SIZE / 512
def poly(points):
    d.polygon([(int(x*scale), int(y*scale)) for x,y in points], fill=255)
# Top chevron and diagonal stroke
poly([(256,54),(410,143),(410,201),(256,290),(198,256),(330,179),(256,136),(132,208),(132,149)])
# Lower-left / lower-right folded strokes
poly([(132,286),(256,215),(314,249),(182,326),(256,369),(380,297),(380,356),(256,434),(102,345),(102,286)])
poly([(380,233),(380,291),(256,362),(198,328)])
# Gradient field matching brand blue/cyan
y,x=np.mgrid[0:SIZE,0:SIZE]
t=np.clip((x*0.65 + (SIZE-y)*0.35)/SIZE,0,1)
blue=np.array([0,55,255],dtype=float)
cyan=np.array([0,210,235],dtype=float)
arr=(blue[None,None,:]*(1-t[:,:,None])+cyan[None,None,:]*t[:,:,None]).astype("uint8")
rgba=np.dstack([arr,np.array(mask)])
mark=Image.fromarray(rgba,"RGBA")
def make_icon(size):
    bg=Image.new("RGBA",(size,size),(2,8,23,255))
    # Keep generous safe margin for rounded launcher masks.
    m=mark.resize((int(size*.82),int(size*.82)),Image.Resampling.LANCZOS)
    bg.alpha_composite(m,((size-m.width)//2,(size-m.height)//2))
    return bg
desktop=ROOT/"zedstore-management"/"electron"
desktop.mkdir(parents=True,exist_ok=True)
make_icon(1024).save(desktop/"icon.png")
make_icon(256).save(desktop/"icon.ico",format="ICO",sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
# Android launcher assets, if the Android Studio project is present.
project=ROOT/"project"
for res in project.rglob("src/main/res"):
    for folder,size in [("mipmap-mdpi",48),("mipmap-hdpi",72),("mipmap-xhdpi",96),("mipmap-xxhdpi",144),("mipmap-xxxhdpi",192)]:
        out=res/folder
        out.mkdir(parents=True,exist_ok=True)
        icon=make_icon(size)
        icon.save(out/"ic_launcher.png")
        icon.save(out/"ic_launcher_round.png")
    make_icon(432).save(res/"mipmap-xxxhdpi"/"ic_launcher_foreground.png")
print("Generated ZED STORE app icons.")
