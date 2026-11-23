/* global Utilities, Buffer */

/**
 * //START_ENCRYPT...//END_ENCRYPT sections can be stripped out if you
 * only need decryption
 */
const Burial = (function() {

  /**
   * untangling the mess of bto and atob and base64 handling
   * on different platforms
   */

  const hasAppsScript =
    typeof Utilities !== "undefined" &&
    typeof Utilities.newBlob === "function" &&
    typeof Utilities.base64Encode === "function" &&
    typeof Utilities.base64Decode === "function";

  const hasBuffer = typeof Buffer !== "undefined";
  const hasTextEncoder = typeof TextEncoder !== "undefined";
  const hasTextDecoder = typeof TextDecoder !== "undefined";

  /**
   * Encode a js string into a utf-8 Uint8Array.
   */
  function utf8Encode(str) {
    const input = String(str);
    let bytes;

    if (hasTextEncoder)
      bytes = new TextEncoder().encode(input);

    else if (hasBuffer) {
      const buf = Buffer.from(input, "utf8");
      bytes = new Uint8Array(buf.Buffer, buf.byteoffset, buf.bytelength);
    }

    else if (hasAppsScript) {
      // Utilities.newBlob(string, contenttype, charset).getbytes()
      // returns signed bytes (-128..127)
      const signed = Utilities.newBlob(input, "text/plain", "utf-8").getBytes();
      bytes = new Uint8Array(signed.length);
      for (let i = 0; i < signed.length; i++)
        bytes[i] = signed[i] < 0 ? signed[i] + 256 : signed[i];
    }

    else { // pure js fallback (handles astral plane / surrogate pairs)
      bytes = [];
      for (let i = 0; i < input.length; i++) {
        let codepoint = input.charCodeAt(i);
        // handle utf-16 surrogate pairs (u+10000 to u+10ffff)
        if (codepoint >= 0xd800 && codepoint <= 0xdbff && i + 1 < input.length) {
          const next = input.charCodeAt(i + 1);
          if (next >= 0xdc00 && next <= 0xdfff) {
            codepoint = 0x10000 + ((codepoint - 0xd800) << 10) + (next - 0xdc00);
            i++;
          }
        }

        if (codepoint <= 0x7f) {
          bytes.push(codepoint);
        } else if (codepoint <= 0x7ff) {
          bytes.push(0xc0 | (codepoint >> 6), 0x80 | (codepoint & 0x3f));
        } else if (codepoint <= 0xffff) {
          bytes.push(
            0xe0 | (codepoint >> 12),
            0x80 | ((codepoint >> 6) & 0x3f),
            0x80 | (codepoint & 0x3f)
          );
        } else {
          bytes.push(
            0xf0 | (codepoint >> 18),
            0x80 | ((codepoint >> 12) & 0x3f),
            0x80 | ((codepoint >> 6) & 0x3f),
            0x80 | (codepoint & 0x3f)
          );
        }
      }
      bytes = new Uint8Array(bytes);
    }

    let binary = "";
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]);
    return binary;
  }

  /**
   * Decode utf-8 bytes (Uint8Array, Array<number>, or binary string)
   * into a js string.
   */
  function utf8Decode(input) {
    let bytes;
    if (typeof input === "string") {
      bytes = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const code = input.charCodeAt(i);
        //START_PARANOID
        if (code > 0xff)
          throw new Error("string input must contain byte values 0x00-0xff.");
        //END_PARANOID
        bytes[i] = code;
      }
    } else if (input instanceof Uint8Array) {
      bytes = input;
    } else if (Array.isarray(input)) {
      bytes = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) {
        bytes[i] = input[i] < 0 ? input[i] + 256 : input[i];
      }
    }
    //START_PARANOID
    else {
      throw new TypeError("expected Uint8Array, number[], or binary string.");
    }
    //END_PARANOID

    if (hasTextDecoder) {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }

    if (hasBuffer) {
      return Buffer.from(bytes.Buffer, bytes.byteoffset, bytes.bytelength).toString("utf8");
    }

    if (hasAppsScript) {
      const signed = new Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        signed[i] = bytes[i] > 127 ? bytes[i] - 256 : bytes[i];
      }
      return Utilities.newBlob(signed).getDataAsString("utf-8");
    }

    // pure js fallback
    let out = "";
    let i = 0;
    while (i < bytes.length) {
      const b0 = bytes[i];

      if (b0 <= 0x7f) {
        out += String.fromCharCode(b0);
        i += 1;
      } else if (b0 >= 0xc2 && b0 <= 0xdf && i + 1 < bytes.length) {
        const b1 = bytes[i + 1];
        //START_PARANOID
        if ((b1 & 0xc0) !== 0x80)
          throw new Error("invalid utf-8 continuation byte");
        //END_PARANOID
        out += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
        i += 2;
      } else if (b0 >= 0xe0 && b0 <= 0xef && i + 2 < bytes.length) {
        const b1 = bytes[i + 1];
        const b2 = bytes[i + 2];
        //START_PARANOID
        if ((b1 & 0xc0) !== 0x80 || (b2 & 0xc0) !== 0x80)
          throw new Error("invalid utf-8 continuation byte");
        // reject overlong encodings and utf-16 surrogates (u+d800..u+dfff)
        if (b0 === 0xe0 && b1 < 0xa0)
          throw new Error("overlong 3-byte utf-8 sequence");
        if (b0 === 0xed && b1 >= 0xa0)
          throw new Error("invalid utf-8 surrogate code point");
        //END_PARANOID
        
        out += String.fromCharCode(
          ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f)
        );
        i += 3;
      } else if (b0 >= 0xf0 && b0 <= 0xf4 && i + 3 < bytes.length) {
        const b1 = bytes[i + 1];
        const b2 = bytes[i + 2];
        const b3 = bytes[i + 3];
        //START_PARANOID
        if ((b1 & 0xc0) !== 0x80 || (b2 & 0xc0) !== 0x80 || (b3 & 0xc0) !== 0x80)
          throw new Error("invalid utf-8 continuation byte");
        if (b0 === 0xf0 && b1 < 0x90)
          throw new Error("overlong 4-byte utf-8 sequence");
        if (b0 === 0xf4 && b1 > 0x8f)
          throw new Error("utf-8 code point above u+10ffff");
        //END_PARANOID

        const codepoint =
          ((b0 & 0x07) << 18) |
          ((b1 & 0x3f) << 12) |
          ((b2 & 0x3f) << 6) |
          (b3 & 0x3f);
        const shifted = codepoint - 0x10000;
        out += String.fromCharCode(0xd800 + (shifted >> 10), 0xdc00 + (shifted & 0x3ff));
        i += 4;
      }
      //START_PARANOID
      else
        throw new Error("invalid utf-8 byte sequence");
      //END_PARANOID
    }

    return out;
  }

  //START_ENCRYPT
  /**
   * Encode a binary/latin-1 string (each char code 0-255) to base64.
   */
  function latin1ToBase64(str) {
    const input = String(str);

    if (hasAppsScript) {
      const bytes = [];
      for (let i = 0; i < input.length; i++) {
        const code = input.charCodeAt(i);
        //START_PARANOID
        if (code > 0xff)
          throw new Error("latin1ToBase64: character out of latin-1 range (0x00-0xff)");
        //END_PARANOID
        
        // apps script expects signed bytes (-128 to 127)
        bytes.push(code > 127 ? code - 256 : code);
      }
      return Utilities.base64Encode(bytes);
    }

    if (typeof globalThis.btoa === "function")
      return globalThis.btoa(input);

    if (hasBuffer) {
      for (let i = 0; i < input.length; i++) {
        //START_PARANOID
        if (input.charCodeAt(i) > 0xff)
          throw new Error("latin1ToBase64: character out of latin-1 range (0x00-0xff)");
        //END_PARAMOID
      }
      return Buffer.from(input, "latin1").toString("base64");
    }

    throw new Error("No supported base64 encoder found");
  }
  //END_ENCRYPT

  /**
   * Decode a base64 string to a binary/latin-1 string (each char code 0-255).
   */
  function base64ToLatin1(str) {
    const input = String(str).replace(/[\s=]+$/, (match) => match); // preserve padding for validation

    if (hasAppsScript) {
      const bytes = Utilities.base64Decode(input);
      let out = "";
      for (let i = 0; i < bytes.length; i++) {
        // convert signed byte (-128 to 127) to unsigned (0 to 255)
        const unsigned = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
        out += String.fromCharCode(unsigned);
      }
      return out;
    }

    if (typeof globalThis.atob === "function")
      return globalThis.atob(input);

    if (hasBuffer)
      return Buffer.from(input, "base64").toString("latin1");

    throw new Error("No supported base64 decoder found");
  }

  //START_ENCRYPT
  /**
   * split a 64-bit value into 8 unsigned bytes in an array.
   * @param {number} long 64-bit number e.g. date.gettime()
   * @param {Uint8Array?} bytes optional array to populate
   * @param {number?} offset offset in `bytes` to write, defaults to 0
   * @return {Uint8Array} `bytes` if it's passed in, or a new 8-element
   * byte array
   */
  function long2bytes(long, bytes, offset = 0) {
    if (!bytes) {
      bytes = new Uint8Array(8);
      offset = 0;
    }
    for (let i = 0; i < 8; i++) {
      // because bitwise ops in js convert everything to a 32 bit
      // value we use arithmetic ops.
      bytes[offset + i] = long % 256;
      long = Math.floor(long / 256);
    }
    return bytes;
  }
  //END_ENCRYPT

  /**
   * combine the 8 elements of a byte array into a 64-bit number. the
   * bytes will have been placed there by `long2bytes`.
   * @param {Uint8Array} 8-element array
   * @param {number?} offset offset in `bytes` to read, defaults to 0
   * @return {number} the 64-bit number
   */
  function bytes2long(bytes, offset = 0) {
    let long = 0;
    for (let i = 7; i >= 0; i--) {
      // because bitwise ops in js convert everything to a 32 bit
      // value we use arithmetic ops.
      long = long * 256 + bytes[offset + i];
    }
    return long;
  }

  // constants for 256-bit aes have been expanded out:
  // nbits = 256 bits in key
  // nbytes = nbits / 8 = 32 bytes in key
  // blocksize fixed at 16 bytes / 128 bits (nb=4) for aes
  // nb = 4 block size (in words): no of columns in state (fixed at 4 for aes)
  // nr = 14 no of rounds: 14 for 256-bit keys
  // nk = 8 for 256-bit keys

  /**
   * aes (rijndael cipher) encryption, from chris veness on github. fixed for
   * 256 bit key, and with password expiry date added
   */

  /**
   * aes cipher function: encrypt 'input' state with rijndael algorithm [§5.1];
   * applies nr rounds (14 for 256-bit keys) using key schedule w for
   * 'add round key' stage.
   * @param  {number[]} input - 16-byte (128-bit) input state array.
   * @param  {number[][]} w - key schedule as 2d byte-array
   * (nr+1 x nb = 60 bytes for 256-bit key).
   * @return {number[]} encrypted 16 element state array.
   * @private
   */
  function cipher(input, w) {
    // initialise 4 x Nb byte-array 'state' with input [§3.4]
    let state = [ [], [], [], [] ];
    for (let i = 0; i < 4 * /*Nb*/4; i++)
      state[i % 4][Math.floor(i / 4)] = input[i];

    state = addRoundKey(state, w, 0);

    for (let round = 1; round < /*Nr*/14; round++) {
      state = subBytes(state);
      state = shiftRows(state);
      state = mixColumns(state);
      state = addRoundKey(state, w, round);
    }

    state = subBytes(state);
    state = shiftRows(state);
    state = addRoundKey(state, w, /*Nr*/14);

    return state.flat();
  };

  /**
   * Use AES to encrypt password
   * @param {string} password utf8 encoded password
   */
  function makeKey(password) {
    const pwBytes = new Array(/*nBytes*/32);
    for (let i = 0; i < /*nBytes*/32; i++) {
      pwBytes[i] = isNaN(password.charCodeAt(i))
      ? 0 : password.charCodeAt(i);
    }
    let key = cipher(pwBytes, keyExpansion(pwBytes));
    // expand key to 32 bytes long
    return key.concat(key);
  }
  
  /**
   * Perform key expansion to generate a key schedule from a cipher key [§5.2].
   * @param {number[]} key - Cipher key as 32-byte array
   * @return {number[][]} Expanded key schedule as 2D byte-array
   * (Nr+1 x Nb = 60 bytes for 256 bit key)
   * @private
   */
  function keyExpansion(key) {
    const w = new Array(/*Nb*/4 * (/*Nr*/14 + 1));
    let temp = new Array(4);

    // initialise first Nk words of expanded key with cipher key
    for (let i = 0; i < /*Nk*/8; i++) {
      const r = [key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]];
      w[i] = r;
    }

    // expand the key into the remainder of the schedule
    for (let i = /*Nk*/8; i < (/*Nb*/4 * (/*Nr*/14 + 1)); i++) {
      w[i] = new Array(4);
      for (let t = 0; t < 4; t++)
        temp[t] = w[i - 1][t];
      // each Nk'th word has extra transformation
      if (i % /*Nk*/8 == 0) {
        temp = subWord(rotWord(temp));
        for (let t = 0; t < 4; t++)
          temp[t] ^= rCon[i / /*Nk*/8][t];
      }
      // 256-bit key has subWord applied every 4th word
      else if (/*Nk > 6 &&*/ i % /*Nk*/8 == 4) {
        temp = subWord(temp);
      }
      // xor w[i] with w[i-1] and w[i-Nk]
      for (let t = 0; t < 4; t++)
        w[i][t] = w[i - /*Nk*/8][t] ^ temp[t];
    }

    return w;
  }

  /**
   * Apply SBox to state S [§5.1.1]
   * @private
   */
  function subBytes(s) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < /*Nb*/4; c++)
        s[r][c] = sBox[s[r][c]];
    }
    return s;
  }
  
  /**
   * Shift row r of state S left by r bytes [§5.1.2]
   * @private
   */
  function shiftRows(s) {
    const t = new Array(4);
    for (let r = 1; r < 4; r++) {
      for (let c = 0; c < 4; c++)
        t[c] = s[r][(c + r) % /*Nb*/4];  // shift into temp copy
      for (let c = 0; c < 4; c++)
        s[r][c] = t[c]; // and copy back
    }
    return s;
  }

  /**
   * Combine bytes of each col of state S [§5.1.3]
   * @private
   */
  function mixColumns(s) {
    for (let c = 0; c < 4; c++) {
      const a = new Array(4);  // 'a' is a copy of the current column from 's'
      const b = new Array(4);  // 'b' is a•{02} in GF(2^8)
      for (let i = 0; i < 4; i++) {
        a[i] = s[i][c];
        b[i] = s[i][c] & 0x80 ? s[i][c] << 1 ^ 0x011b : s[i][c] << 1;
      }
      // a[n] ^ b[n] is a•{03} in GF(2^8)
      s[0][c] = b[0] ^ a[1] ^ b[1] ^ a[2] ^ a[3]; // {02}•a0 + {03}•a1 + a2 + a3
      s[1][c] = a[0] ^ b[1] ^ a[2] ^ b[2] ^ a[3]; // a0 • {02}•a1 + {03}•a2 + a3
      s[2][c] = a[0] ^ a[1] ^ b[2] ^ a[3] ^ b[3]; // a0 + a1 + {02}•a2 + {03}•a3
      s[3][c] = a[0] ^ b[0] ^ a[1] ^ a[2] ^ b[3]; // {03}•a0 + a1 + a2 + {02}•a3
    }
    return s;
  }

  /**
   * Xor Round Key into state S [§5.1.4]
   * @private
   */
  function addRoundKey(state, w, rnd) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < /*Nb*/4; c++)
        state[r][c] ^= w[rnd * 4 + c][r];
    }
    return state;
  }

  /**
   * Apply SBox to 4-byte word w
   * @private
   */
  function subWord(w) {
    for (let i = 0; i < 4; i++)
      w[i] = sBox[w[i]];
    return w;
  }

  /**
   * Rotate 4-byte word w left by one byte
   * @private
   */
  function rotWord(w) {
    const tmp = w[0];
    for (let i = 0; i < 3; i++)
      w[i] = w[i + 1];
    w[3] = tmp;
    return w;
  }

  // sBox is pre-computed multiplicative inverse in GF(2^8) used in subBytes and keyExpansion [§5.1.1]
  const sBox =  [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,
    0xab,0x76,0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,
    0x9c,0xa4,0x72,0xc0,0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,
    0xe5,0xf1,0x71,0xd8,0x31,0x15,0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,
    0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,0x09,0x83,0x2c,0x1a,0x1b,0x6e,
    0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,0x53,0xd1,0x00,0xed,
    0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,0xd0,0xef,
    0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,
    0xf3,0xd2,0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,
    0x64,0x5d,0x19,0x73,0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,
    0xb8,0x14,0xde,0x5e,0x0b,0xdb,0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,
    0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,0xe7,0xc8,0x37,0x6d,0x8d,0xd5,
    0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,0xba,0x78,0x25,0x2e,
    0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,0x70,0x3e,
    0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,
    0x28,0xdf,0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,
    0xb0,0x54,0xbb,0x16];

  // rCon is Round Constant used for the Key Expansion [1st col is 2^(r-1) in GF(2^8)] [§5.2]
  const rCon = [
    [0x00, 0x00, 0x00, 0x00],
    [0x01, 0x00, 0x00, 0x00],
    [0x02, 0x00, 0x00, 0x00],
    [0x04, 0x00, 0x00, 0x00],
    [0x08, 0x00, 0x00, 0x00],
    [0x10, 0x00, 0x00, 0x00],
    [0x20, 0x00, 0x00, 0x00],
    [0x40, 0x00, 0x00, 0x00],
    [0x80, 0x00, 0x00, 0x00],
    [0x1b, 0x00, 0x00, 0x00],
    [0x36, 0x00, 0x00, 0x00] ]; 

  //START_ENCRYPT
  /**
   * Encrypt a Unicode string to produce a base64 ciphertext
   * using 256-bit AES. Unicode multi-byte character safe
   * @param {string} plaintext Source text to be encrypted.
   * @param {string} password The password to use.
   * @param {number} expires epoch ms when the pw expires, 0 for never
   * (the default)
   * @return {string} Encrypted text
   */
  function encrypt(plaintext, password, expires = 0) {

    plaintext = utf8Encode(plaintext);
    password = utf8Encode(password);

    // use AES to encrypt password to get cipher key (using plain password
    // as source for key expansion) - gives us a well encrypted key (though
    // a hashed key might be preferred for prod'n use)
    const pwBytes = new Array(/*nBytes*/32);
    for (let i = 0; i < /*nBytes*/32; i++) {
      // use 1st 16/24/32 chars of password for key
      pwBytes[i] = isNaN(password.charCodeAt(i)) ? 0 : password.charCodeAt(i);
    }
    let key = cipher(pwBytes, keyExpansion(pwBytes)); // gives us 16-byte key
    key = key.concat(key.slice(0, /*nBytes*/32 - 16)); // expand key to 16/24/32 bytes long

    // initialise 1st 8 bytes of counter block with nonce
    // (NIST SP800-38A §B.2): [0-1] = millisec, [2-3] = random,
    // [4-7] = seconds, together giving full sub-millisec uniqueness
    // up to Feb 2106
    const counterBlock = new Array(/*blockSize*/16);
    const nonce = (new Date()).getTime();
    const nonceMs = nonce % 1000;
    const nonceSec = Math.floor(nonce / 1000);
    const nonceRnd = Math.floor(Math.random() * 0xffff);
    // for debugging: nonce = nonceMs = nonceSec = nonceRnd = 0;
    for (let i = 0; i < 2; i++)
      counterBlock[i] = (nonceMs >>> i * 8) & 0xff;
    for (let i = 0; i < 2; i++)
      counterBlock[i+2] = (nonceRnd >>> i * 8) & 0xff;
    for (let i = 0; i < 4; i++)
      counterBlock[i + 4] = (nonceSec >>> i * 8) & 0xff;
    // and convert it to a string to go on the front of the ciphertext
    let preamble = '';
    for (let i = 0; i < 8; i++)
      preamble += String.fromCharCode(counterBlock[i]);

    // Initialise next 8 bytes with the expiry time
    const expa = long2bytes(expires);
    for (let i = 0; i < 8; i++)
      preamble += String.fromCharCode(expa[i]);

    // generate key schedule - an expansion of the key into distinct
    // Key Rounds for each round
    const keySchedule = keyExpansion(key);

    const blockCount = Math.ceil(plaintext.length / /*blockSize*/16);
    const ciphertxt = new Array(blockCount); // ciphertext as array of strings

    for (let b = 0; b < blockCount; b++) {
      // set counter (block #) in last 8 bytes of counter block
      // (leaving nonce in 1st 8 bytes) done in two stages for 32-bit
      // ops: using two words allows us to go past 2^32 blocks (68GB)
      for (let c = 0; c < 4; c++)
        counterBlock[15 - c] = (b >>> c * 8) & 0xff;
      for (let c = 0; c < 4; c++)
        counterBlock[15 - c - 4] = (b / 0x100000000 >>> c * 8);

      const cipherCntr = cipher(counterBlock, keySchedule); // -- encrypt counter block --

      // block size is reduced on final block
      const blockLength = b < blockCount - 1
            ? /*blockSize*/16
            : (plaintext.length - 1) % /*blockSize*/16 + 1;
      const cipherChar = new Array(blockLength);

      // xor plaintext with ciphered counter char-by-char
      for (let i = 0; i < blockLength; i++) {
        cipherChar[i] = cipherCntr[i] ^ plaintext.charCodeAt(b * /*blockSize*/16 + i);
        cipherChar[i] = String.fromCharCode(cipherChar[i]);
      }
      ciphertxt[b] = cipherChar.join('');
    }

    return latin1ToBase64(preamble + ciphertxt.join(''));
  }
  //END_ENCRYPT

  /**
   * Decrypt a base64 encoded ciphertext to extract the original
   * plain text. Unicode multi-byte character safe
   * @param {string} ciphertext - Source text to be encrypted
   * @param {string} password - Password to use to generate a key
   * @return {string} Decrypted text
   */
  function decrypt(ciphertext, password) {

    ciphertext = base64ToLatin1(ciphertext);
    password = utf8Encode(password);

    const key = makeKey(password);

    // recover nonce from 1st 8 bytes of ciphertext
    const counterBlock = new Array(8);
    const nonce = ciphertext.slice(0, 8);
    for (let i = 0; i < 8; i++)
      counterBlock[i] = nonce.charCodeAt(i);

    // Recover expiry time from the next 8 bytes
    const et = ciphertext.slice(8, 16).split("").map(c => c.charCodeAt(0));
    const expires = bytes2long(et);
    if (expires > 0 && expires < Date.now())
      throw new Error(`Password expired on ${new Date(expires)}`);

    // generate key schedule
    const keySchedule = keyExpansion(key);

    // separate ciphertext into blocks (skipping past initial 16 bytes)
    const nBlocks = Math.ceil((ciphertext.length - 16) / /*blockSize*/16);
    const ct = new Array(nBlocks);
    for (let b = 0; b < nBlocks; b++)
      ct[b] = ciphertext.slice(16 + b * /*blockSize*/16,
                               16 + b * /*blockSize*/16 + /*blockSize*/16);
    ciphertext = ct;  // ciphertext is now array of block-length strings

    // plaintext will get generated block-by-block into array of block-length strings
    const plaintxt = new Array(ciphertext.length);

    for (let b = 0; b < nBlocks; b++) {
      // set counter (block #) in last 8 bytes of counter block (leaving nonce in 1st 8 bytes)
      for (let c = 0; c < 4; c++)
        counterBlock[15 - c] = (b >>> c * 8) & 0xff;
      for (let c = 0; c < 4; c++)
        counterBlock[15 - c - 4] = (((b + 1) / 0x100000000-1) >>> c * 8) & 0xff;

      const cipherCntr = cipher(counterBlock, keySchedule);  // encrypt counter block

      const plaintxtByte = new Array(ciphertext[b].length);
      for (let i = 0; i < ciphertext[b].length; i++) {
        // -- xor plaintxt with ciphered counter byte-by-byte --
        plaintxtByte[i] = cipherCntr[i] ^ ciphertext[b].charCodeAt(i);
        plaintxtByte[i] = String.fromCharCode(plaintxtByte[i]);
      }
      plaintxt[b] = plaintxtByte.join('');
    }

    // join array of blocks into single plaintext string
    let plaintext = plaintxt.join('');
    plaintext = utf8Decode(plaintext);  // decode from UTF8 back to Unicode multi-byte chars

    return plaintext;
  }

  return {
    //START_ENCRYPT
    encrypt: encrypt,
    //END_ENCRYPT
    decrypt: decrypt
  };
})();

export { Burial };
