/**
 * Thai Encoding & Character Detection Utility
 * Handles UTF-8, Windows-874 (TIS-620 / CP874), and UTF-16LE files.
 */

export type SupportedEncoding = 'auto' | 'windows-874' | 'utf-8' | 'utf-16le';

// Windows-874 single-byte to Unicode fallback mapping table
const WIN874_TABLE: { [key: number]: number } = {
  0x80: 0x20AC, // Euro
  0x85: 0x2026, // Ellipsis
  0x91: 0x2018, // Left single quote
  0x92: 0x2019, // Right single quote
  0x93: 0x201C, // Left double quote
  0x94: 0x201D, // Right double quote
  0x95: 0x2022, // Bullet
  0x96: 0x2013, // En dash
  0x97: 0x2014, // Em dash
};

/**
 * Decode ArrayBuffer using pure JS Windows-874 mapping as a reliable fallback
 */
export function decodeWindows874(uint8: Uint8Array): string {
  // First try native TextDecoder('windows-874')
  try {
    const decoder = new TextDecoder('windows-874');
    return decoder.decode(uint8);
  } catch {
    // Fallback: manual byte-to-char conversion
    let result = '';
    for (let i = 0; i < uint8.length; i++) {
      const b = uint8[i];
      if (b < 0x80) {
        result += String.fromCharCode(b);
      } else if (b >= 0xA1 && b <= 0xDA) {
        // Thai consonants and vowels: 0xA1-0xDA -> 0x0E01-0x0E3A
        result += String.fromCharCode(0x0E01 + (b - 0xA1));
      } else if (b >= 0xDF && b <= 0xFB) {
        // Thai symbols, tone marks, digits: 0xDF-0xFB -> 0x0E3F-0x0E5B
        result += String.fromCharCode(0x0E3F + (b - 0xDF));
      } else if (WIN874_TABLE[b]) {
        result += String.fromCharCode(WIN874_TABLE[b]);
      } else {
        result += String.fromCharCode(b);
      }
    }
    return result;
  }
}

/**
 * Count valid Thai Unicode characters in a string
 */
export function countThaiCharacters(str: string): number {
  const matches = str.match(/[\u0E01-\u0E5B]/g);
  return matches ? matches.length : 0;
}

/**
 * Smart decode of a File with automatic Thai encoding detection:
 * - Checks BOM (UTF-8, UTF-16LE, UTF-16BE)
 * - Tries UTF-8 and Windows-874 / TIS-620
 * - Automatically chooses whichever produces the highest number of valid Thai characters!
 */
export async function decodeFileSmart(
  file: File,
  forcedEncoding: SupportedEncoding = 'auto'
): Promise<{
  text: string;
  detectedEncoding: string;
  thaiCharCount: number;
}> {
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  // 1. Check for Byte Order Mark (BOM)
  if (uint8.length >= 3 && uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF) {
    const text = new TextDecoder('utf-8').decode(uint8.subarray(3));
    return {
      text,
      detectedEncoding: 'UTF-8 (BOM)',
      thaiCharCount: countThaiCharacters(text),
    };
  }

  if (uint8.length >= 2 && uint8[0] === 0xFF && uint8[1] === 0xFE) {
    const text = new TextDecoder('utf-16le').decode(uint8.subarray(2));
    return {
      text,
      detectedEncoding: 'UTF-16 LE (BOM)',
      thaiCharCount: countThaiCharacters(text),
    };
  }

  if (uint8.length >= 2 && uint8[0] === 0xFE && uint8[1] === 0xFF) {
    const text = new TextDecoder('utf-16be').decode(uint8.subarray(2));
    return {
      text,
      detectedEncoding: 'UTF-16 BE (BOM)',
      thaiCharCount: countThaiCharacters(text),
    };
  }

  // Check for UTF-16 LE without BOM (common in Windows "Unicode Text .txt" exports)
  if (uint8.length >= 8 && uint8[1] === 0x00 && uint8[3] === 0x00 && uint8[5] === 0x00) {
    const text = new TextDecoder('utf-16le').decode(uint8);
    return {
      text,
      detectedEncoding: 'UTF-16 LE (Unicode Text)',
      thaiCharCount: countThaiCharacters(text),
    };
  }

  // 2. Forced encoding if user explicitly selected one
  if (forcedEncoding === 'windows-874') {
    const text = decodeWindows874(uint8);
    return {
      text,
      detectedEncoding: 'Windows-874 / TIS-620 (กำหนดเอง)',
      thaiCharCount: countThaiCharacters(text),
    };
  }

  if (forcedEncoding === 'utf-8') {
    const text = new TextDecoder('utf-8').decode(uint8);
    return {
      text,
      detectedEncoding: 'UTF-8 (กำหนดเอง)',
      thaiCharCount: countThaiCharacters(text),
    };
  }

  if (forcedEncoding === 'utf-16le') {
    const text = new TextDecoder('utf-16le').decode(uint8);
    return {
      text,
      detectedEncoding: 'UTF-16 LE (กำหนดเอง)',
      thaiCharCount: countThaiCharacters(text),
    };
  }

  // 3. Auto-detection: Compare UTF-8 vs Windows-874
  let utf8Text = '';
  let utf8Error = false;
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    utf8Text = utf8Decoder.decode(uint8);
  } catch {
    utf8Error = true;
    try {
      utf8Text = new TextDecoder('utf-8').decode(uint8);
    } catch {
      utf8Text = '';
    }
  }

  const win874Text = decodeWindows874(uint8);

  const utf8ThaiCount = countThaiCharacters(utf8Text);
  const win874ThaiCount = countThaiCharacters(win874Text);

  // If UTF-8 had an encoding error OR Windows-874 yields more Thai characters
  if (utf8Error || win874ThaiCount > utf8ThaiCount) {
    return {
      text: win874Text,
      detectedEncoding: 'Windows-874 / TIS-620 (ภาษาไทย ANSI/Excel)',
      thaiCharCount: win874ThaiCount,
    };
  }

  // Otherwise, default to UTF-8
  return {
    text: utf8Text,
    detectedEncoding: 'UTF-8',
    thaiCharCount: utf8ThaiCount,
  };
}
