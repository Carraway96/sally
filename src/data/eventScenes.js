const props = { tote_bag: "chili", bathroom_refresh: "hanging_planter", mello: "chili", we_word: "basil", phone_break: "basil", mirror_hall: "grow_light" };
export function getEventScene(event) {
  if (!event) return null;
  return { id: event.id, title: event.name, image: `images/${props[event.id] || "chili"}.png`, effect: event.desc,
    replies: { share: "Vi hittar plats tillsammans. Jag lagar något med basilikan!", defend: "Okej, jag flyttar krukan. Men chilin vill ha fönsterplats." },
    shots: [{ speaker: "Sally", line: "Bara en liten planta till. Den matchar mina valnötsörhängen!" }, { speaker: "Du", line: "Vi behöver en plan för både plantorna och oss." }] };
}
