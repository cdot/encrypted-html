/**
 * This is the master source used in appscript, browser, and in node.js
 * START_BROWSER..END_BROWSER demarcates browser-specific code
 * START_ENCODE..END_ENCODE demarcates code that is only used in encryption
 */

/**
 * Encryption and decryption with support for expiry dates.
 */
function Burial() { 
  // ES3-style class that uglifies nicely.

  // Chars valid in base 64
  const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  //START_ENCODE
  /**
   * Encode an array of byte integers (0..255) into a base 64 string.
   * @param {Uint8Array|[]} numbers array of bytes to encode
   * @return {string} a base 64 string
   */
  function BtoA(numbers) {
    let out = '';
    const len = numbers.length;

    for (let i = 0; i < len; i += 3) {
      const b0 = numbers[i];
      if (!Number.isInteger(b0) || b0 < 0 || b0 > 255)
        throw new RangeError(
          `Expected byte in 0..255 at index ${i}, got ${b0}`);

      const hasB1 = i + 1 < len;
      const hasB2 = i + 2 < len;
      const b1 = hasB1 ? numbers[i + 1] : 0;
      const b2 = hasB2 ? numbers[i + 2] : 0;

      if (hasB1 && (!Number.isInteger(b1) || b1 < 0 || b1 > 255))
        throw new RangeError(
          `Expected byte in 0..255 at index ${i + 1}, got ${b1}`);
      if (hasB2 && (!Number.isInteger(b2) || b2 < 0 || b2 > 255))
        throw new RangeError(
          `Expected byte in 0..255 at index ${i + 2}, got ${b2}`);

      const triple = (b0 << 16) | (b1 << 8) | b2;

      out += B64_CHARS[(triple >>> 18) & 0x3f];
      out += B64_CHARS[(triple >>> 12) & 0x3f];
      out += hasB1 ? B64_CHARS[(triple >>> 6) & 0x3f] : '=';
      out += hasB2 ? B64_CHARS[triple & 0x3f] : '=';
    }

    return out;
  }
  this.BtoA = BtoA;
  //END_ENCODE

  /**
   * Decodes a Base64 string produced by BtoA back into an array
   * of byte numbers (0..255). Works identically in Node.js, browsers,
   * and Google Apps Script.
   */
  function AtoB(base64) {
    //START_ENCODE
    if (typeof base64 !== 'string') {
      throw new TypeError('Expected a Base64 string');
    }
    //END_ENCODE

    const clean = base64.replace(/\s+/g, '');
    if (clean.length === 0)
      return [];

    //START_ENCODE
    if (clean.length % 4 !== 0) {
      throw new RangeError('Invalid Base64 length');
    }
    //END_ENCODE

    let arr = [];
    for (let i = 0; i < clean.length; i = i + 4) {
      const c0 = B64_CHARS.indexOf(clean.charAt(i)),
            c1 = B64_CHARS.indexOf(clean.charAt(i + 1)),
            c2 = B64_CHARS.indexOf(clean.charAt(i + 2)),
            c3 = B64_CHARS.indexOf(clean.charAt(i + 3));

      const b0 = (c0 << 2) | (c1 >> 4),
            b1 = ((c1 & 15) << 4) | (c2 >> 2),
            b2 = ((c2 & 3) << 6) | c3;

      arr.push(b0, b1, b2);
    }
    // assumes the content is a multiple of 16 long - which is OK for our purposes
    arr = arr.slice(0, arr.length - (arr.length % 16));
    return arr;
  }
  this.AtoB = AtoB;

  /**
   * Split a 64-bit value into 8 unsigned bytes in an array.
   * @param {number} long 64-bit number e.g. Date.getTime()
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
      // Because bitwise ops in JS convert everything to a 32 bit
      // value we use arithmetic ops.
      bytes[offset + i] = long % 256;
      long = Math.floor(long / 256);
    }
    return bytes;
  }

  /**
   * Combine the 8 elements of a byte array into a 64-bit number. The
   * bytes will have been placed there by `long2bytes`.
   * @param {Uint8Array} 8-element array
   * @param {number?} offset offset in `bytes` to read, defaults to 0
   * @return {number} the 64-bit number
   */
  function bytes2long(bytes, offset = 0) {
    let long = 0;
    for (let i = 7; i >= 0; i--) {
      // Because bitwise ops in JS convert everything to a 32 bit
      // value we use arithmetic ops.
      long = long * 256 + bytes[offset + i];
    }
    return long;
  }

  /* DEBUG - consistency between runs of the encryption*/
     let nextrand = 0;
     Math.random = () => nextrand++ / 1000;
  /**/

  // 256 bit CBC encryption
  const NR = 14, NK = 8;

  function strhex(str, size) {
    const ret = [];
    for (let i = 0; i < str.length; i += size)
      ret[i / size] = parseInt(str.substr(i, size), 16);
    return ret;
  }

  const RND = strhex('67452301efcdab8998badcfe10325476d76aa478e8c7b756242070dbc1bdceeef57c0faf4787c62aa8304613fd469501698098d88b44f7afffff5bb1895cd7be6b901122fd987193a679438e49b40821f61e2562c040b340265e5a51e9b6c7aad62f105d02441453d8a1e681e7d3fbc821e1cde6c33707d6f4d50d87455a14eda9e3e905fcefa3f8676f02d98d2a4c8afffa39428771f6816d9d6122fde5380ca4beea444bdecfa9f6bb4b60bebfbc70289b7ec6eaa127fad4ef308504881d05d9d4d039e6db99e51fa27cf8c4ac5665f4292244432aff97ab9423a7fc93a039655b59c38f0ccc92ffeff47d85845dd16fa87e4ffe2ce6e0a30143144e0811a1f7537e82bd3af2352ad7d2bbeb86d391', 8);

  function MD5(numArr) {
    function rotateLeft(lValue, iShiftBits) {
      return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }

    function addUnsigned(lX, lY) {
      const lX8 = (lX & 0x80000000);
      const lY8 = (lY & 0x80000000);
      const lX4 = (lX & 0x40000000);
      const lY4 = (lY & 0x40000000);
      const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
      if (lX4 & lY4)
        return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
      if (lX4 | lY4)
        return (lResult & 0x40000000)
      ? (lResult ^ 0xC0000000 ^ lX8 ^ lY8)
      : (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      return (lResult ^ lX8 ^ lY8);
    }

    const f = (x, y, z) => (x & y) | ((~x) & z);
    const g = (x, y, z) => (x & z) | (y & (~z));
    const h = (x, y, z) => (x ^ y ^ z);
    const funcI = (x, y, z) => (y ^ (x | (~z)));

    function ff(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function gg(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function hh(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function ii(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(funcI(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(numArr) {
      const lMessageLength = numArr.length;
      const lNumberOfWords_temp1 = lMessageLength + 8;
      const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
      const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
      const lWordArray = [];
      let lWordCount;
      let lBytePosition;
      let lByteCount = 0;
      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = (lWordArray[lWordCount] | (numArr[lByteCount] << lBytePosition));
        lByteCount++;
      }
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordArray;
    }

    function wordToHex(lValue) {
      let lByte;
      const wordToHexArr = [];
      for (let lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255;
        wordToHexArr[lCount] = lByte;
      }
      return wordToHexArr;
    }

    const x = convertToWordArray(numArr);
    
    let a = RND[0];
    let b = RND[1];
    let c = RND[2];
    let d = RND[3];

    for (let k = 0; k < x.length; k += 16) {
      const AA = a;
      const BB = b;
      const CC = c;
      const DD = d;
      a = ff(a, b, c, d, x[k + 0], 7, RND[4]);
      d = ff(d, a, b, c, x[k + 1], 12, RND[5]);
      c = ff(c, d, a, b, x[k + 2], 17, RND[6]);
      b = ff(b, c, d, a, x[k + 3], 22, RND[7]);
      a = ff(a, b, c, d, x[k + 4], 7, RND[8]);
      d = ff(d, a, b, c, x[k + 5], 12, RND[9]);
      c = ff(c, d, a, b, x[k + 6], 17, RND[10]);
      b = ff(b, c, d, a, x[k + 7], 22, RND[11]);
      a = ff(a, b, c, d, x[k + 8], 7, RND[12]);
      d = ff(d, a, b, c, x[k + 9], 12, RND[13]);
      c = ff(c, d, a, b, x[k + 10], 17, RND[14]);
      b = ff(b, c, d, a, x[k + 11], 22, RND[15]);
      a = ff(a, b, c, d, x[k + 12], 7, RND[16]);
      d = ff(d, a, b, c, x[k + 13], 12, RND[17]);
      c = ff(c, d, a, b, x[k + 14], 17, RND[18]);
      b = ff(b, c, d, a, x[k + 15], 22, RND[19]);
      a = gg(a, b, c, d, x[k + 1], 5, RND[20]);
      d = gg(d, a, b, c, x[k + 6], 9, RND[21]);
      c = gg(c, d, a, b, x[k + 11], 14, RND[22]);
      b = gg(b, c, d, a, x[k + 0], 20, RND[23]);
      a = gg(a, b, c, d, x[k + 5], 5, RND[24]);
      d = gg(d, a, b, c, x[k + 10], 9, RND[25]);
      c = gg(c, d, a, b, x[k + 15], 14, RND[26]);
      b = gg(b, c, d, a, x[k + 4], 20, RND[27]);
      a = gg(a, b, c, d, x[k + 9], 5, RND[28]);
      d = gg(d, a, b, c, x[k + 14], 9, RND[29]);
      c = gg(c, d, a, b, x[k + 3], 14, RND[30]);
      b = gg(b, c, d, a, x[k + 8], 20, RND[31]);
      a = gg(a, b, c, d, x[k + 13], 5, RND[32]);
      d = gg(d, a, b, c, x[k + 2], 9, RND[33]);
      c = gg(c, d, a, b, x[k + 7], 14, RND[34]);
      b = gg(b, c, d, a, x[k + 12], 20, RND[35]);
      a = hh(a, b, c, d, x[k + 5], 4, RND[36]);
      d = hh(d, a, b, c, x[k + 8], 11, RND[37]);
      c = hh(c, d, a, b, x[k + 11], 16, RND[38]);
      b = hh(b, c, d, a, x[k + 14], 23, RND[39]);
      a = hh(a, b, c, d, x[k + 1], 4, RND[40]);
      d = hh(d, a, b, c, x[k + 4], 11, RND[41]);
      c = hh(c, d, a, b, x[k + 7], 16, RND[42]);
      b = hh(b, c, d, a, x[k + 10], 23, RND[43]);
      a = hh(a, b, c, d, x[k + 13], 4, RND[44]);
      d = hh(d, a, b, c, x[k + 0], 11, RND[45]);
      c = hh(c, d, a, b, x[k + 3], 16, RND[46]);
      b = hh(b, c, d, a, x[k + 6], 23, RND[47]);
      a = hh(a, b, c, d, x[k + 9], 4, RND[48]);
      d = hh(d, a, b, c, x[k + 12], 11, RND[49]);
      c = hh(c, d, a, b, x[k + 15], 16, RND[50]);
      b = hh(b, c, d, a, x[k + 2], 23, RND[51]);
      a = ii(a, b, c, d, x[k + 0], 6, RND[52]);
      d = ii(d, a, b, c, x[k + 7], 10, RND[53]);
      c = ii(c, d, a, b, x[k + 14], 15, RND[54]);
      b = ii(b, c, d, a, x[k + 5], 21, RND[55]);
      a = ii(a, b, c, d, x[k + 12], 6, RND[56]);
      d = ii(d, a, b, c, x[k + 3], 10, RND[57]);
      c = ii(c, d, a, b, x[k + 10], 15, RND[58]);
      b = ii(b, c, d, a, x[k + 1], 21, RND[59]);
      a = ii(a, b, c, d, x[k + 8], 6, RND[60]);
      d = ii(d, a, b, c, x[k + 15], 10, RND[61]);
      c = ii(c, d, a, b, x[k + 6], 15, RND[62]);
      b = ii(b, c, d, a, x[k + 13], 21, RND[63]);
      a = ii(a, b, c, d, x[k + 4], 6, RND[64]);
      d = ii(d, a, b, c, x[k + 11], 10, RND[65]);
      c = ii(c, d, a, b, x[k + 2], 15, RND[66]);
      b = ii(b, c, d, a, x[k + 9], 21, RND[67]);
      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }

    return wordToHex(a).concat(wordToHex(b), wordToHex(c), wordToHex(d));
  }

  function openSSLKey(passwordArr, saltArr) {
    // Number of rounds depends on the size of the AES in use
    // 3 rounds for 256
    //        2 rounds for the key, 1 for the IV
    // 2 rounds for 128
    //        1 round for the key, 1 round for the IV
    // 3 rounds for 192 since it's not evenly divided by 128 bits
    const rounds = NR >= 12 ? 3 : 2;
    const data00 = passwordArr.concat(saltArr);
    const md5_hash = [ MD5(data00) ];
    let result = md5_hash[0];
    for (let i = 1; i < rounds; i++) {
      md5_hash[i] = MD5(md5_hash[i - 1].concat(data00));
      result = result.concat(md5_hash[i]);
    }
    const key = result.slice(0, 4 * NK);
    const iv = result.slice(4 * NK, 4 * NK + 16);
    return {
      key: key,
      iv: iv
    };
  }

  function invertArr(arr) {
    const ret = [];
    for (let i = 0; i < arr.length; i++)
      ret[arr[i]] = i;
    return ret;
  }

  const SBOX = strhex('637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0b7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b27509832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cfd0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2cd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdbe0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08ba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9ee1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16',2);

  const RCON = strhex('01020408102040801b366cd8ab4d9a2f5ebc63c697356ad4b37dfaefc591',2);

  const SBOXINV = invertArr(SBOX);

  function Gx(x) {
    
    function Gxx(a, b) {
      let ret = 0;
      for (let i = 0; i < 8; i++) {
        ret = ((b & 1) === 1) ? ret ^ a : ret;
        /* xmult */
        a = (a > 0x7f) ? 0x11b ^ (a << 1) : (a << 1);
        b >>>= 1;
      }
      return ret;
    }

    const r = [];
    for (let i = 0; i < 256; i++)
      r[i] = Gxx(x, i);
    return r;
  }

  const G2X = Gx(2);
  const G3X = Gx(3);
  const G9X = Gx(9);
  const GBX = Gx(0xb);
  const GDX = Gx(0xd);
  const GEX = Gx(0xe);

  function expandKey(key) {
    // Expects a 1d number array

    function subWord(w) {
      // apply SBox to 4-byte word w
      for (let i = 0; i < 4; i++)
        w[i] = SBOX[w[i]];
      return w;
    }

    function rotWord(w) {
      // rotate 4-byte word w left by one byte
      let tmp = w[0];
      for (let i = 0; i < 3; i++)
        w[i] = w[i + 1];
      w[3] = tmp;
      return w;
    }

    const w = [];
    let temp = [];
    const flat = [];

    for (let i = 0; i < NK; i++)
      w[i] = [key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]];

    for (let i = NK; i < (4 * (NR + 1)); i++) {
      w[i] = [];
      let t;
      for (t = 0; t < 4; t++)
        temp[t] = w[i - 1][t];
      if (i % NK === 0) {
        temp = subWord(rotWord(temp));
        temp[0] ^= RCON[i / NK - 1];
      } else if (NK > 6 && i % NK === 4) {
        temp = subWord(temp);
      }
      for (t = 0; t < 4; t++)
        w[i][t] = w[i - NK][t] ^ temp[t];
    }
    for (let i = 0; i < (NR + 1); i++) {
      flat[i] = [];
      for (let j = 0; j < 4; j++)
        for (let k = 0; k < 4; k++)
          flat[i].push(w[i * 4 + j][k]);
    }
    return flat;
  }

  function xorBlocks(block1, block2) {
    const temp = [];
    for (let i = 0; i < 16; i++)
      temp[i] = block1[i] ^ block2[i];
    return temp;
  }

  function addRoundKey(state, words, round) {
    const temp = [];
    for (let i = 0; i < 16; i++)
      temp[i] = state[i] ^ words[round][i];
    return temp;
  }

  function subBytes(state, S) {
    const temp = [];
    for (let i = 0; i < 16; i++)
      temp[i] = S[state[i]];
    return temp;
  }

  function shiftRows(state, shiftBy) {
    const temp = [];
    for (let i = 0; i < 16; i++)
      temp[i] = state[shiftBy[i]];
    return temp;
  }

  //START_ENCODE
  function encryptBlock(block, words) {
    let state = addRoundKey(block, words, 0);
    for (let round = 1; round < (NR + 1); round++) {
      state = subBytes(state, SBOX);
      state = shiftRows(
        state, [0, 5, 10, 15, 4, 9, 14, 3, 8, 13, 2, 7, 12, 1, 6, 11]);
      if (round < NR)
        state = mixColumnsE(state);
      //last round? don't mixColumns
      state = addRoundKey(state, words, round);
    }

    return state;
  }

  function rawEncrypt(plaintext, key, iv) {
    function padBlock(byteArr)    {
      let array = [];
      if (byteArr.length < 16) {
        const cpad = 16 - byteArr.length;
        array = [cpad, cpad, cpad, cpad, cpad, cpad, cpad, cpad,
                 cpad, cpad, cpad, cpad, cpad, cpad, cpad, cpad];
      }
      for (let i = 0; i < byteArr.length; i++)
        array[i] = byteArr[i];
      return array;
    }

    // plaintext, key and iv as byte arrays
    key = expandKey(key);
    const numBlocks = Math.ceil(plaintext.length / 16);
    const blocks = [];
    const cipherBlocks = [];

    for (let i = 0; i < numBlocks; i++)
      blocks[i] = padBlock(plaintext.slice(i * 16, i * 16 + 16));

    if (plaintext.length % 16 === 0)
      blocks.push([16, 16, 16, 16, 16, 16, 16, 16,
                   16, 16, 16, 16, 16, 16, 16, 16]);

    for (let i = 0; i < blocks.length; i++) {
      if (i === 0)
        blocks[i] = xorBlocks(blocks[i], iv);
      else
        blocks[i] = xorBlocks(blocks[i], cipherBlocks[i - 1]);
      cipherBlocks[i] = encryptBlock(blocks[i], key);
    }
    return cipherBlocks;
  }
  //END_ENCODE

  function decryptBlock(block, words) {
    let state = addRoundKey(block, words, NR);

    for (let round = NR - 1; round > -1; round--) {
      state = shiftRows(
        state, [0, 13, 10, 7, 4, 1, 14, 11, 8, 5, 2, 15, 12, 9, 6, 3]);
      state = subBytes(state, SBOXINV);
      state = addRoundKey(state, words, round);
      if (round > 0)
        state = mixColumnsD(state);
      //last round? don't mixColumns
    }

    return state;
  }

  function rawDecrypt(cryptArr, key, iv) {

    function block2s(block, lastBlock)    {
      let string = '', padding, i;
      if (lastBlock) {
        padding = block[15];
        if (padding > 16)
          throw new Error('Failed to decrypt');
        if (padding === 16)
          return '';
        for (i = 0; i < 16 - padding; i++)
          string += String.fromCharCode(block[i]);
      } else {
        for (i = 0; i < 16; i++)
          string += String.fromCharCode(block[i]);
      }
      return string;
    }

    // cryptArr, key and iv as byte arrays
    key = expandKey(key);
    const cipherBlocks = [];
    const plainBlocks = [];
    const numBlocks = cryptArr.length / 16;
    for (let i = 0; i < numBlocks; i++) {
      cipherBlocks.push(cryptArr.slice(i * 16, (i + 1) * 16));
    }

    for (let i = cipherBlocks.length - 1; i >= 0; i--) {
      plainBlocks[i] = decryptBlock(cipherBlocks[i], key);
      plainBlocks[i] = (i === 0)
      ? xorBlocks(plainBlocks[i], iv)
      : xorBlocks(plainBlocks[i], cipherBlocks[i - 1]);
    }
    let string = '';
    for (let i = 0; i < numBlocks - 1; i++)
      string += block2s(plainBlocks[i], false);
    string += block2s(plainBlocks[numBlocks - 1], true);
    return decodeURIComponent(escape(string));
  }

  function mixColumnsE(state) {
    const t = [];
    for (let c = 0; c < 4; c++) {
      t[c * 4] = G2X[state[c * 4]] ^ G3X[state[1 + c * 4]]
      ^ state[2 + c * 4] ^ state[3 + c * 4];
      t[1 + c * 4] = state[c * 4] ^ G2X[state[1 + c * 4]]
      ^ G3X[state[2 + c * 4]] ^ state[3 + c * 4];
      t[2 + c * 4] = state[c * 4] ^ state[1 + c * 4]
      ^ G2X[state[2 + c * 4]] ^ G3X[state[3 + c * 4]];
      t[3 + c * 4] = G3X[state[c * 4]] ^ state[1 + c * 4]
      ^ state[2 + c * 4] ^ G2X[state[3 + c * 4]];
    }
    
    return t;
  }

  function mixColumnsD(state) {
    const t = [];
    for (let c = 0; c < 4; c++) {
      t[c*4] = GEX[state[c*4]] ^ GBX[state[1+c*4]]
      ^ GDX[state[2+c*4]] ^ G9X[state[3+c*4]];
      t[1+c*4] = G9X[state[c*4]] ^ GEX[state[1+c*4]]
      ^ GBX[state[2+c*4]] ^ GDX[state[3+c*4]];
      t[2+c*4] = GDX[state[c*4]] ^ G9X[state[1+c*4]]
      ^ GEX[state[2+c*4]] ^ GBX[state[3+c*4]];
      t[3+c*4] = GBX[state[c*4]] ^ GDX[state[1+c*4]]
      ^ G9X[state[2+c*4]] ^ GEX[state[3+c*4]];
    }
    
    return t;
  }

  function s2a(string) {
    const array = [];
    for (let i = 0; i < string.length; i++)
      array[i] = string.charCodeAt(i);
    return array;
  }

  //START_ENCODE
  /**
   * @param {string} plain text to encrypt
   * @param {string} pass encryption password
   * @param {number} expires expiry time, in epoch ms
   * @return {string} base 64 encoded encrypted string
   */
  this.encrypt = (plain, pass, expires = 9007199254740991) => {
    const sig = long2bytes(expires);
    const rand = [];
    for (let i = 0; i < 8; i++)
      rand[i] = Math.floor(Math.random() * 256);
    const salt = Array.from(sig).concat(rand);
    const data = s2a(plain);
    const pbe = openSSLKey(s2a(pass), rand);
    const cipher = salt.concat(rawEncrypt(data, pbe.key, pbe.iv).flat());
    return BtoA(cipher);
  };
  //END_ENCODE

  /**
   * @param {string} crypt base-64 encoded cipher to decrypt
   * @param {string} pass encryption password
   * @return {string} unencrypted text
   */
  this.decrypt = (crypt, pass) => {
    // the +256 is because base64Encode/base64Decode are not symmetric
    const cryptArr = AtoB(crypt);
    // Get and check the expiry in the first 8 bytes
    const expires = bytes2long(cryptArr);
    if (expires > 0 && expires < Date.now())
      throw new Error(`Password expired on ${new Date(expires)}`);
    const salt = cryptArr.slice(8, 16);
    const pbe = openSSLKey(s2a(pass), salt);
    const body = cryptArr.slice(16, cryptArr.length);
    return rawDecrypt(body, pbe.key, pbe.iv);
  };
}

//START_BROWSER
function handleDecrypt() {
  const crypt = document.getElementById("content").textContent;
  const pass = document.getElementById("pass").value;
  try {
    document.body.innerHTML = new Burial().decrypt(crypt, pass);
  } catch (e) {
    alert(e);
  }
}

//START_TESTING
export { Burial, handleDecrypt }
//END_TESTING

//END_BROWSER
