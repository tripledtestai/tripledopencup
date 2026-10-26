/**
 * Unikey / Vietnamese IME (Telex & VNI) Resilient Keyboard Mapper
 * Ensures smooth WASD, Shift (Nitro), Space (Item), and R (Rescue) controls
 * even when Vietnamese input methods (Unikey, EVKey, macOS Telex/VNI) are active.
 * Supports customizable keybindings with localStorage persistence.
 */

export interface CustomKeyBindings {
  forward: string[];
  reverse: string[];
  steerLeft: string[];
  steerRight: string[];
  nitro: string[];
  useItem: string[];
  rescue: string[];
  pause: string[];
}

export const DEFAULT_KEY_BINDINGS: CustomKeyBindings = {
  forward: ['KeyW', 'ArrowUp'],
  reverse: ['KeyS', 'ArrowDown'],
  steerLeft: ['KeyA', 'ArrowLeft'],
  steerRight: ['KeyD', 'ArrowRight'],
  nitro: ['ShiftLeft', 'ShiftRight'],
  useItem: ['Space'],
  rescue: ['KeyR'],
  pause: ['KeyP', 'Escape'],
};

export function getKeyBindings(): CustomKeyBindings {
  try {
    const saved = localStorage.getItem('tripled_key_bindings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        forward: Array.isArray(parsed.forward) ? parsed.forward : DEFAULT_KEY_BINDINGS.forward,
        reverse: Array.isArray(parsed.reverse) ? parsed.reverse : DEFAULT_KEY_BINDINGS.reverse,
        steerLeft: Array.isArray(parsed.steerLeft) ? parsed.steerLeft : DEFAULT_KEY_BINDINGS.steerLeft,
        steerRight: Array.isArray(parsed.steerRight) ? parsed.steerRight : DEFAULT_KEY_BINDINGS.steerRight,
        nitro: Array.isArray(parsed.nitro) ? parsed.nitro : DEFAULT_KEY_BINDINGS.nitro,
        useItem: Array.isArray(parsed.useItem) ? parsed.useItem : DEFAULT_KEY_BINDINGS.useItem,
        rescue: Array.isArray(parsed.rescue) ? parsed.rescue : DEFAULT_KEY_BINDINGS.rescue,
        pause: Array.isArray(parsed.pause) ? parsed.pause : DEFAULT_KEY_BINDINGS.pause,
      };
    }
  } catch {
    // Return default on error
  }
  return DEFAULT_KEY_BINDINGS;
}

export function saveKeyBindings(bindings: CustomKeyBindings): void {
  try {
    localStorage.setItem('tripled_key_bindings', JSON.stringify(bindings));
  } catch (err) {
    console.error('Failed to save key bindings:', err);
  }
}

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

  if (e.code) {
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
 */
export function extractGameKeysFromKeyUp(e: KeyEventLike): string[] {
  const result = new Set<string>();

  if (e.code) {
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

/**
 * Helper to display human-readable label for key codes
 */
export function getKeyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ArrowUp') return '⬆ Trái/Lên';
  if (code === 'ArrowDown') return '⬇ Phanh/Lùi';
  if (code === 'ArrowLeft') return '⬅ Trái';
  if (code === 'ArrowRight') return '➡ Phải';
  if (code === 'Space') return 'Space';
  if (code === 'Escape') return 'ESC';
  return code;
}
