/**
 * Unikey / Vietnamese IME (Telex & VNI) Resilient Keyboard Mapper
 * Ensures smooth WASD, Shift (Nitro), Space (Item), and R (Rescue) controls
 * even when Vietnamese input methods (Unikey, EVKey, macOS Telex/VNI) are active.
 */

const KNOWN_CODES = new Set<string>([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyR',
  'KeyP',
  'Space',
  'ShiftLeft',
  'ShiftRight',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Escape',
]);

const KEYCODE_TO_CODE: Record<number, string> = {
  87: 'KeyW',
  65: 'KeyA',
  83: 'KeyS',
  68: 'KeyD',
  82: 'KeyR',
  80: 'KeyP',
  32: 'Space',
  16: 'ShiftLeft',
  38: 'ArrowUp',
  40: 'ArrowDown',
  37: 'ArrowLeft',
  39: 'ArrowRight',
  27: 'Escape',
};

/**
 * Maps Vietnamese Telex / VNI composed characters back to the underlying WASD / R key(s)
 * that produced them when Unikey is enabled.
 */
const VIETNAMESE_KEY_MAP: Record<string, string[]> = {
  // W (Accelerate) & Telex W -> ư / ơ
  w: ['KeyW'],
  ư: ['KeyW'],
  ơ: ['KeyW'],
  ừ: ['KeyW'],
  ờ: ['KeyW'],
  ự: ['KeyW'],
  ợ: ['KeyW'],
  ữ: ['KeyW'],
  ỡ: ['KeyW'],

  // A (Left) + W (Accelerate) -> ă in Telex
  ă: ['KeyA', 'KeyW'],
  ằ: ['KeyA', 'KeyW'],
  ặ: ['KeyA', 'KeyW'],
  ẵ: ['KeyA', 'KeyW'],

  // A (Left) & Telex AA -> â
  a: ['KeyA'],
  â: ['KeyA'],
  à: ['KeyA'],
  ầ: ['KeyA'],
  ạ: ['KeyA'],
  ậ: ['KeyA'],
  ã: ['KeyA'],
  ẫ: ['KeyA'],

  // D (Right) & Telex DD -> đ
  d: ['KeyD'],
  đ: ['KeyD'],

  // S (Brake/Reverse) & Telex S (dấu sắc) on previous vowels
  s: ['KeyS'],
  ứ: ['KeyW', 'KeyS'],
  ớ: ['KeyW', 'KeyS'],
  ắ: ['KeyA', 'KeyW', 'KeyS'],
  á: ['KeyA', 'KeyS'],
  ấ: ['KeyA', 'KeyS'],
  é: ['KeyS'],
  ế: ['KeyS'],
  í: ['KeyS'],
  ó: ['KeyS'],
  ố: ['KeyS'],
  ú: ['KeyS'],
  ý: ['KeyS'],

  // R (Rescue) & Telex R (dấu hỏi) on previous vowels
  r: ['KeyR'],
  ử: ['KeyW', 'KeyR'],
  ở: ['KeyW', 'KeyR'],
  ẳ: ['KeyA', 'KeyW', 'KeyR'],
  ả: ['KeyA', 'KeyR'],
  ẩ: ['KeyA', 'KeyR'],
  ẻ: ['KeyR'],
  ể: ['KeyR'],
  ỉ: ['KeyR'],
  ỏ: ['KeyR'],
  ổ: ['KeyR'],
  ủ: ['KeyR'],
  ỷ: ['KeyR'],

  // Other controls
  p: ['KeyP'],
  ' ': ['Space'],
  spacebar: ['Space'],
  shift: ['ShiftLeft'],
  escape: ['Escape'],
  esc: ['Escape'],
  arrowup: ['ArrowUp'],
  arrowdown: ['ArrowDown'],
  arrowleft: ['ArrowLeft'],
  arrowright: ['ArrowRight'],
};

export interface KeyEventLike {
  code?: string;
  key?: string;
  keyCode?: number;
  which?: number;
}

/**
 * Extracts canonical game key codes (`KeyW`, `KeyA`, `KeyS`, `KeyD`, `KeyR`, `Space`, `ShiftLeft`, etc.)
 * from a `keydown` event, seamlessly handling Unikey Telex/VNI transformations and VK_PACKET events.
 */
export function extractGameKeysFromKeyDown(e: KeyEventLike): string[] {
  const result = new Set<string>();

  if (e.code && KNOWN_CODES.has(e.code)) {
    result.add(e.code);
  }

  const numericCode = e.keyCode || e.which || 0;
  if (numericCode && KEYCODE_TO_CODE[numericCode]) {
    result.add(KEYCODE_TO_CODE[numericCode]);
  }

  if (e.key) {
    const lower = e.key.toLowerCase();
    const mapped = VIETNAMESE_KEY_MAP[lower];
    if (mapped) {
      for (const k of mapped) {
        result.add(k);
      }
    }
  }

  return Array.from(result);
}

/**
 * Extracts canonical game key codes to release on `keyup`.
 * Ignores synthetic Unikey `VK_PACKET` keyup events (where `code === ''` and `keyCode` is 229/231/0/8)
 * so holding W/A/S/D with Unikey active never stutters or drops input mid-hold.
 */
export function extractGameKeysFromKeyUp(e: KeyEventLike): string[] {
  const result = new Set<string>();

  if (e.code && KNOWN_CODES.has(e.code)) {
    result.add(e.code);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      result.add('ShiftLeft');
      result.add('ShiftRight');
    }
  }

  const numericCode = e.keyCode || e.which || 0;
  if (numericCode && KEYCODE_TO_CODE[numericCode]) {
    const mapped = KEYCODE_TO_CODE[numericCode];
    result.add(mapped);
    if (mapped === 'ShiftLeft') {
      result.add('ShiftRight');
    }
  }

  // If neither physical `e.code` nor hardware `keyCode` matched, check if this is a synthetic IME packet
  if (result.size === 0) {
    const isSyntheticImePacket =
      (!e.code || e.code === '' || e.code === 'Unidentified') &&
      (numericCode === 0 ||
        numericCode === 8 ||
        numericCode === 229 ||
        numericCode === 231);

    if (!isSyntheticImePacket && e.key) {
      const lower = e.key.toLowerCase();
      const mapped = VIETNAMESE_KEY_MAP[lower];
      if (mapped) {
        for (const k of mapped) {
          result.add(k);
        }
      }
    }
  }

  return Array.from(result);
}

/**
 * Returns true if the event target is an interactive text input where typing should not be intercepted.
 */
export function isTypingInInput(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable === true
  );
}
