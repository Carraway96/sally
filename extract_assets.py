from PIL import Image
from pathlib import Path
import sys

root = Path(__file__).parent
atlas = Image.open(sys.argv[1]).convert('RGBA')
names = ['sally_front','sally_back','sally_left','sally_right','sally_avatar','chili','hanging_planter','basil','grow_light']
for i, name in enumerate(names):
    col,row=i%3,i//3
    box=(round(col*atlas.width/3),round(row*atlas.height/3),round((col+1)*atlas.width/3),round((row+1)*atlas.height/3))
    img=atlas.crop(box)
    bbox=img.getchannel('A').point(lambda a: 255 if a > 128 else 0).getbbox()
    if bbox: img=img.crop(bbox)
    img.save(root/'images'/f'{name}.png')
print('Saved nine transparent Sally assets.')
