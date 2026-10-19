import type { LevelData, PickupKind, Rect } from './types';

/** A hidden closet behind a secret wall (E to open). */
export interface SecretSpec {
  door: [number, number];
  rect: Rect;
  loot: PickupKind[];
}

/**
 * Extra secret closets per chapter. Each sits in solid rock behind a one-cell secret door; the
 * positions were picked by scanning the maps for wall pockets with a full cell of rock around them.
 */
export const EXTRA_SECRETS: Record<string, SecretSpec[]> = {
  level01: [
    { door: [62, 6], rect: [61, 3, 3, 3], loot: ['armor', 'shellBox'] },
    { door: [64, 29], rect: [63, 26, 3, 3], loot: ['healthLarge', 'bulletBox'] },
  ],
  level02: [
    { door: [29, 3], rect: [30, 2, 3, 3], loot: ['armor', 'grenades'] },
    { door: [29, 14], rect: [30, 13, 3, 3], loot: ['healthLarge', 'shellBox'] },
  ],
  level03: [
    { door: [33, 3], rect: [34, 2, 3, 3], loot: ['armor', 'rounds'] },
    { door: [33, 14], rect: [34, 13, 3, 3], loot: ['healthLarge', 'grenades'] },
  ],
  level04: [
    { door: [44, 7], rect: [43, 4, 3, 3], loot: ['armor', 'rockets'] },
    { door: [23, 5], rect: [22, 2, 3, 3], loot: ['healthLarge', 'shellBox'] },
    { door: [4, 5], rect: [3, 2, 3, 3], loot: ['rounds', 'grenades'] },
  ],
  level05: [
    { door: [37, 3], rect: [38, 2, 3, 3], loot: ['armor', 'rockets'] },
    { door: [40, 14], rect: [39, 15, 3, 3], loot: ['healthLarge', 'rounds'] },
    { door: [35, 23], rect: [34, 24, 3, 3], loot: ['shellBox', 'grenades'] },
  ],
  level06: [
    { door: [37, 3], rect: [38, 2, 3, 3], loot: ['armor', 'rockets'] },
    { door: [40, 14], rect: [39, 15, 3, 3], loot: ['healthLarge', 'bolts'] },
    { door: [3, 22], rect: [2, 23, 3, 3], loot: ['armor', 'fuel'] },
  ],
};

export function withSecrets(L: LevelData): LevelData {
  const specs = EXTRA_SECRETS[L.id];
  if (!specs) return L;
  const out: LevelData = { ...L, zones: [...L.zones], doors: [...L.doors], secrets: [...L.secrets], things: [...L.things] };
  specs.forEach((s, i) => {
    const id = `xs${i}`;
    // borrow the look of the room the door opens from
    const [dx, dy] = s.door;
    const host = L.zones.find((z) => Math.abs(dx - (z.rect[0] + z.rect[2] / 2)) <= z.rect[2] / 2 + 1 && Math.abs(dy - (z.rect[1] + z.rect[3] / 2)) <= z.rect[3] / 2 + 1) ?? L.zones[0];
    out.zones.push({ id, rect: s.rect, floor: host.floor, ceil: host.floor + 3, floorTex: host.floorTex, ceilTex: host.ceilTex, wallTex: host.wallTex, ambient: [0.14, 0.1, 0.06] });
    out.doors.push({ id: 'd_' + id, rect: [dx, dy, 1, 1], type: 'secret', ceil: host.floor + 3 });
    out.secrets.push({ id: 's_' + id, rect: s.rect });
    const [rx, ry] = s.rect;
    s.loot.forEach((k, j) => out.things.push({ kind: k, x: rx + 1 + (j === 0 ? 0.5 : 1.5), y: ry + 1.5 }));
  });
  return out;
}
