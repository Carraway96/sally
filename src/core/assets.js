import { HEIGHT, WIDTH } from "./dom.js";
import { furniture } from "./data.js";

export function imageWithFallback(paths) {
  const img = new Image();
  let index = 0;
  img.src = paths[index];
  img.onerror = () => {
    index += 1;
    if (index < paths.length) {
      img.src = paths[index];
    }
  };
  return img;
}

export const colliders = [];

export function pushBaseColliders() {
  colliders.length = 0;
  colliders.push(
    { x: 0, y: 0, w: WIDTH, h: 16 },
    { x: 0, y: HEIGHT - 16, w: WIDTH, h: 16 },
    { x: 0, y: 0, w: 16, h: HEIGHT },
    { x: WIDTH - 16, y: 0, w: 16, h: HEIGHT },
    { x: 302, y: 16, w: 18, h: 176 },
    { x: 302, y: 262, w: 18, h: 44 },
    { x: 690, y: 16, w: 18, h: 132 },
    { x: 690, y: 218, w: 18, h: 142 },
    { x: 16, y: 342, w: 228, h: 18 },
    { x: 340, y: 342, w: 230, h: 18 },
    { x: 700, y: 342, w: 284, h: 18 }
  );

  furniture.forEach((piece) => {
    if (piece.collider) {
      colliders.push(piece.collider);
    }
  });
}

pushBaseColliders();

export const assets = {
  sally_walk: imageWithFallback(["images/sally_walk.png"]),
  girl_back: imageWithFallback(["images/sally_back.png"]),
  girl_front: imageWithFallback(["images/sally_front.png"]),
  girl_left: imageWithFallback(["images/sally_left.png"]),
  girl_right: imageWithFallback(["images/sally_right.png"]),
  main_back: imageWithFallback(["images/main_back.png"]),
  main_front: imageWithFallback(["images/main_front.png"]),
  main_left: imageWithFallback(["images/main_left.png"]),
  main_right: imageWithFallback(["images/main_right.png"]),
  girl_avatar: imageWithFallback(["images/sally_avatar.png"]),
  guy_avatar: imageWithFallback(["images/guy_avatar.png"]),
  start: imageWithFallback(["images/sally_cover.png"]),
  endingGirlification: imageWithFallback(["images/sally_cover.png"]),
  endingIrritation: imageWithFallback(["images/sally_cover.png"]),
  sofa: imageWithFallback(["images/assett_sofa.png", "images/asset_sofa.png"]),
  bed: imageWithFallback(["images/assett_bed.png", "images/asset_bed.png"]),
  bathtub: imageWithFallback(["images/asset_bathtub.png"]),
  oven: imageWithFallback(["images/asset_oven.png"]),
  shoe_rack: imageWithFallback(["images/asset_shoe_rack.png"]),
  table: imageWithFallback(["images/asset_table.png"]),
  tv: imageWithFallback(["images/asset_tv_back.png"]),
  shared_shelf_story: imageWithFallback(["images/blender_shared_shelf_story.png", "images/asset_shoe_rack.png"]),
  toiletry_story: imageWithFallback(["images/blender_toiletry_bag.png", "images/asset_skincare.png"]),
};

export const itemAssets = {
  chili: imageWithFallback(["images/chili.png"]),
  hanging_planter: imageWithFallback(["images/hanging_planter.png"]),
  basil: imageWithFallback(["images/basil.png"]),
  grow_light: imageWithFallback(["images/grow_light.png"]),

  candle: imageWithFallback(["images/assett_candle.png", "images/asset_candle.png"]),
  pillow: imageWithFallback(["images/asset_pillow.png"]),
  plant: imageWithFallback(["images/asset__plant.png", "images/asset_plant.png"]),
  blanket: imageWithFallback(["images/asset_blanket.png"]),
  art: imageWithFallback(["images/asset_art.png"]),
  skincare: imageWithFallback(["images/asset_skincare.png"]),
  mug: imageWithFallback(["images/asset_mug.png"]),
  fairy_lights: imageWithFallback(["images/asset_failry_lights.png", "images/asset_fairy_lights.png"]),
  basket: imageWithFallback(["images/asset_basket.png"]),
  snack_bowl: imageWithFallback(["images/asset_snack_bowl.png"]),
  charger: imageWithFallback(["images/asset_charger.png"]),
  mirror_boss: imageWithFallback(["images/grow_light.png"]),
  shared_shelf_boss: imageWithFallback(["images/hanging_planter.png", "images/asset_shoe_rack.png"]),
};
