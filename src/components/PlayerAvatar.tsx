import { useEffect, useMemo, useRef, useState } from 'react';
import { colorsFor } from './crestUtil';
import type { Club } from '../types/club';
import meta from './playerSprites.json';
import wunderkindUrl from '../assets/sprites/player_wunderkind.png';
import topUrl from '../assets/sprites/player_top.png';
import solidUrl from '../assets/sprites/player_solid.png';
import lateUrl from '../assets/sprites/player_late.png';

export type AvatarTalent = 'wunderkind' | 'top' | 'solid' | 'late' | string;
export type AvatarAnim =
  | 'bereit'
  | 'bereitSchraeg'
  | 'laufen'
  | 'jonglieren'
  | 'torschuss'
  | 'jubel'
  | 'foul';

/** Short reaction played once on top of the idle loop. */
export type AvatarMood = 'idle' | 'cheer' | 'sad' | 'hurt' | 'train';
/** Sprite animations each mood plays (sad has none: CSS dims the figure). */
const MOOD_ANIMS: Record<AvatarMood, AvatarAnim[]> = {
  idle: [],
  cheer: ['torschuss', 'jubel'],
  sad: [],
  hurt: ['foul'],
  train: ['laufen'],
};

/** Default idle rotation; the angled pose shows up once per round. */
const IDLE: AvatarAnim[] = ['bereit', 'jonglieren', 'bereit', 'laufen', 'bereit', 'bereitSchraeg'];
/** How often each idle animation loops before the next one (≈ 2–4 s each). */
const IDLE_LOOPS: Partial<Record<AvatarAnim, number>> = {
  bereit: 2,
  jonglieren: 2,
  laufen: 2,
  bereitSchraeg: 3,
};

type Talent = 'wunderkind' | 'top' | 'solid' | 'late';
interface AnimMeta {
  y: number;
  w: number;
  h: number;
  frames: Record<Talent, number>;
  dur: number;
}
const ANIMS = meta.anims as Record<AvatarAnim, AnimMeta>;
const URLS: Record<Talent, string> = {
  wunderkind: wunderkindUrl,
  top: topUrl,
  solid: solidUrl,
  late: lateUrl,
};
/** Reference height: the figure in "bereit" fills `size` px. */
const REF_H = ANIMS.bereit.h;
/** Clubs that play in halved shirts (left secondary, right primary). */
const HALVES = new Set(['galatasaray']);

type RGB = [number, number, number];
/** Key colours baked into the atlas: [dark, base, light] per kit part. */
const KEYS: Record<'j1' | 'j2' | 'sh', RGB[]> = {
  j1: [[0, 99, 0], [0, 160, 0], [89, 193, 89]],
  j2: [[99, 0, 99], [160, 0, 160], [193, 89, 193]],
  sh: [[0, 0, 99], [0, 0, 160], [89, 89, 193]],
};

/** Same shading as the sprite pipeline (kit.tones). */
function tones(c: RGB): RGB[] {
  if (Math.min(...c) > 200) {
    return [c.map((v) => Math.floor(v * 0.8)) as RGB, c, c.map((v) => Math.min(255, Math.floor(v + (255 - v) * 0.5))) as RGB];
  }
  return [
    c.map((v) => Math.floor(v * 0.62)) as RGB,
    c,
    c.map((v) => Math.min(255, Math.floor(v + (255 - v) * 0.35))) as RGB,
  ];
}

/** Any CSS colour (hex, hsl …) to RGB via a 1×1 canvas. */
function toRgb(css: string): RGB {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

const images = new Map<Talent, Promise<HTMLImageElement>>();
function loadImage(t: Talent): Promise<HTMLImageElement> {
  let p = images.get(t);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URLS[t];
    });
    images.set(t, p);
  }
  return p;
}

const sheets = new Map<string, Promise<HTMLCanvasElement>>();
/** Atlas recoloured into the club kit, cached per talent + kit. */
function kitSheet(t: Talent, shirtL: string, shirtR: string, shorts: string): Promise<HTMLCanvasElement> {
  const key = `${t}|${shirtL}|${shirtR}|${shorts}`;
  let p = sheets.get(key);
  if (!p) {
    p = loadImage(t).then((img) => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      const px = data.data;
      const map = new Map<number, RGB>();
      const add = (k: RGB[], to: RGB[]) => k.forEach((kc, i) => map.set((kc[0] << 16) | (kc[1] << 8) | kc[2], to[i]));
      add(KEYS.j1, tones(toRgb(shirtL)));
      add(KEYS.j2, tones(toRgb(shirtR)));
      add(KEYS.sh, tones(toRgb(shorts)));
      for (let i = 0; i < px.length; i += 4) {
        if (!px[i + 3]) continue;
        const to = map.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
        if (to) {
          px[i] = to[0];
          px[i + 1] = to[1];
          px[i + 2] = to[2];
        }
      }
      ctx.putImageData(data, 0, 0);
      return c;
    });
    sheets.set(key, p);
  }
  return p;
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

interface Props {
  talent: AvatarTalent;
  club: Club | null;
  /** Figure height in px (standing pose). */
  size?: number;
  /** Looping idle animations, played in turn (each `idleLoops` times, default per animation). */
  idle?: AvatarAnim[];
  idleLoops?: number;
  /** One-shot animations; played once each whenever `playKey` changes, then back to idle. */
  play?: AvatarAnim[];
  playKey?: string | number;
  /** One-off reaction (cheer after a win, sad after a loss, hurt on injury). */
  mood?: AvatarMood;
  /** Pop-in plus celebration, used by the talent reveal. */
  reveal?: boolean;
  /** Short flicker, used when the shirt changes (transfer). */
  swap?: boolean;
}

/** Animated retro footballer in the club kit (Hero-based sprites, 1 atlas per talent). */
export function PlayerAvatar({
  talent,
  club,
  size = 72,
  idle = IDLE,
  idleLoops,
  play,
  playKey,
  mood = 'idle',
  reveal = false,
  swap = false,
}: Props) {
  const t: Talent = (talent in URLS ? talent : 'solid') as Talent;
  const [primary, secondary] = club ? colorsFor(club) : ['#e63946', '#ffd23f'];
  const halves = club ? HALVES.has(club.id) : false;
  const shirtL = halves ? secondary : primary;
  const shorts = halves ? primary : secondary;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sheet, setSheet] = useState<HTMLCanvasElement | null>(null);
  const [anim, setAnim] = useState<AvatarAnim>(idle[0]);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let alive = true;
    kitSheet(t, shirtL, primary, shorts).then((s) => alive && setSheet(s));
    return () => {
      alive = false;
    };
  }, [t, shirtL, primary, shorts]);

  // Queue of one-shot animations, refilled whenever playKey changes.
  const queue = useRef<AvatarAnim[]>([]);
  const idleIdx = useRef(0);
  const loops = useRef(0);
  const idleKey = idle.join(',');
  const start = (anims: AvatarAnim[]) => {
    if (!anims.length) return;
    queue.current = [...anims];
    loops.current = 0;
    setAnim(anims[0]);
    setRun((r) => r + 1);
  };
  useEffect(() => {
    if (play) start(play);
  }, [playKey]);
  useEffect(() => {
    start(MOOD_ANIMS[mood]);
  }, [mood]);
  useEffect(() => {
    if (reveal) start(['jubel']);
  }, [reveal]);

  useEffect(() => {
    if (!sheet) return;
    const m = ANIMS[anim];
    const n = m.frames[t];
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    let frame = 0;
    let timer = 0;
    const draw = () => {
      ctx.clearRect(0, 0, m.w, m.h);
      ctx.drawImage(sheet, frame * m.w, m.y, m.w, m.h, 0, 0, m.w, m.h);
    };
    draw();
    if (reducedMotion()) return;
    const tick = () => {
      frame++;
      if (frame >= n) {
        frame = 0;
        if (queue.current.length) {
          queue.current.shift();
          const next = queue.current[0] ?? idle[idleIdx.current % idle.length];
          if (next !== anim) return setAnim(next);
        } else if (++loops.current >= (idleLoops ?? IDLE_LOOPS[anim] ?? 2) && idle.length > 1) {
          loops.current = 0;
          idleIdx.current = (idleIdx.current + 1) % idle.length;
          return setAnim(idle[idleIdx.current]);
        }
      }
      draw();
      timer = window.setTimeout(tick, m.dur);
    };
    timer = window.setTimeout(tick, m.dur);
    return () => window.clearTimeout(timer);
  }, [sheet, anim, run, t, idleKey, idleLoops]);

  const m = ANIMS[anim];
  const scale = size / REF_H;
  const box = useMemo(() => ({ w: ANIMS.bereit.w * scale, h: size }), [scale, size]);
  return (
    <div
      className={`avatar av-${t}${mood !== 'idle' ? ` mood-${mood}` : ''}${reveal ? ' av-reveal' : ''}${swap ? ' av-swap' : ''}`}
      style={{ width: box.w, height: box.h }}
      role="img"
      aria-label={`Spielerfigur ${t}`}
    >
      <canvas
        ref={canvasRef}
        width={m.w}
        height={m.h}
        style={{
          width: m.w * scale,
          height: m.h * scale,
          left: Math.round((box.w - m.w * scale) / 2),
        }}
      />
    </div>
  );
}
