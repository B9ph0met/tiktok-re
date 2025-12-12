/**
 * X-Bogus Generator
 * 
 * Reverse-engineered implementation of TikTok's X-Bogus signature algorithm.
 * 
 * Algorithm:
 * 1. Double MD5 hash the URL params and body
 * 2. RC4 encrypt user-agent, Base64 encode, then MD5
 * 3. Build data array with timestamps, magic number, and hash bytes
 * 4. Filter and scramble the bytes
 * 5. RC4 encrypt with final key
 * 6. Add prefix bytes and custom Base64 encode
 * 
 * Usage:
 *   node xbogus.mjs "<url>" "<userAgent>"
 */

import crypto from 'crypto';

// Custom Base64 alphabet used by TikTok
const SHIFT_ARRAY = "Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe";

// Magic number used in X-Bogus generation
const MAGIC_NUMBER = 536919696;

// RC4 keys
const RC4_UA_KEY = [0, 1, 14];
const RC4_FINAL_KEY = [255];

/**
 * Generate X-Bogus signature
 */
function generateXBogus(url, userAgent, timestamp = null) {
    if (!timestamp) {
        timestamp = Math.floor(Date.now() / 1000);
    }

    // Step 1: Generate MD5 hashes
    const paramsHash = doubleMD5(url);
    const bodyHash = doubleMD5('');
    const uaHash = userAgentHash(userAgent);

    // Step 2: Build the core data array
    const dataArray = buildDataArray(timestamp, paramsHash, bodyHash, uaHash);

    // Step 3: Filter and scramble
    const filtered = filterBytes(dataArray);
    const scrambled = scrambleBytes(filtered);

    // Step 4: RC4 encrypt with final key
    const encrypted = rc4Encrypt(scrambled, RC4_FINAL_KEY);

    // Step 5: Add prefix bytes and custom Base64 encode
    const prefixed = [2, 255, ...encrypted];
    return customBase64Encode(prefixed);
}

/**
 * Double MD5: MD5(MD5(data))
 */
function doubleMD5(data) {
    const first = crypto.createHash('md5').update(data).digest('hex');
    const second = crypto.createHash('md5').update(first).digest('hex');
    return second;
}

/**
 * User-agent hash: RC4 encrypt -> custom Base64 -> MD5
 */
function userAgentHash(ua) {
    const encrypted = rc4Encrypt(Buffer.from(ua), RC4_UA_KEY);
    const encoded = customBase64Encode(encrypted);
    const hash = crypto.createHash('md5').update(encoded).digest('hex');
    return hash;
}

/**
 * Build the core data array for X-Bogus
 */
function buildDataArray(timestamp, paramsHash, bodyHash, uaHash) {
    const data = [];

    // Add timestamp bytes (little-endian)
    const ts = timestamp >>> 0;
    data.push(ts & 0xFF);
    data.push((ts >> 8) & 0xFF);
    data.push((ts >> 16) & 0xFF);
    data.push((ts >> 24) & 0xFF);

    // Add magic number bytes (little-endian)
    const mn = MAGIC_NUMBER >>> 0;
    data.push(mn & 0xFF);
    data.push((mn >> 8) & 0xFF);
    data.push((mn >> 16) & 0xFF);
    data.push((mn >> 24) & 0xFF);

    // Add constants
    data.push(0, 1, 14, 0);

    // Add last 2 bytes from each hash (4 hex chars = 2 bytes)
    const paramsBytes = hexToBytes(paramsHash.slice(-4));
    const bodyBytes = hexToBytes(bodyHash.slice(-4));
    const uaBytes = hexToBytes(uaHash.slice(-4));

    data.push(...paramsBytes);
    data.push(...bodyBytes);
    data.push(...uaBytes);

    // Add timestamp bytes again
    data.push(ts & 0xFF);
    data.push((ts >> 8) & 0xFF);
    data.push((ts >> 16) & 0xFF);
    data.push((ts >> 24) & 0xFF);

    // Calculate and add checksum (XOR of all bytes)
    let checksum = 0;
    for (const b of data) {
        checksum ^= b;
    }
    data.push(checksum);

    return data;
}

/**
 * Filter bytes - select 19 specific bytes in predefined order
 */
function filterBytes(data) {
    const indices = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 1, 3, 5, 7, 9, 11, 13, 15, 17];
    const result = [];
    for (const i of indices) {
        if (i < data.length) {
            result.push(data[i]);
        }
    }
    return result;
}

/**
 * Scramble bytes - interleave into new arrangement
 */
function scrambleBytes(data) {
    if (data.length === 0) return data;

    const result = new Array(data.length);
    const mid = Math.floor(data.length / 2);

    let j = 0;
    for (let i = 0; i < mid; i++) {
        result[j++] = data[i];
        if (i + mid < data.length) {
            result[j++] = data[i + mid];
        }
    }

    // Handle odd length
    if (data.length % 2 !== 0) {
        result[result.length - 1] = data[data.length - 1];
    }

    return result;
}

/**
 * RC4 stream cipher encryption
 */
function rc4Encrypt(data, key) {
    // Initialize S-box
    const s = new Array(256);
    for (let i = 0; i < 256; i++) {
        s[i] = i;
    }

    // Key scheduling
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + s[i] + key[i % key.length]) % 256;
        [s[i], s[j]] = [s[j], s[i]];
    }

    // Encryption
    const result = new Array(data.length);
    let i = 0;
    j = 0;
    for (let k = 0; k < data.length; k++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        [s[i], s[j]] = [s[j], s[i]];
        result[k] = data[k] ^ s[(s[i] + s[j]) % 256];
    }

    return result;
}

/**
 * Custom Base64 encode using TikTok's alphabet
 */
function customBase64Encode(data) {
    if (data.length === 0) return '';

    const result = [];

    for (let i = 0; i < data.length; i += 3) {
        let chunk = data[i] << 16;
        let padding = 0;

        if (i + 1 < data.length) {
            chunk |= data[i + 1] << 8;
        } else {
            padding++;
        }

        if (i + 2 < data.length) {
            chunk |= data[i + 2];
        } else {
            padding++;
        }

        result.push(SHIFT_ARRAY[(chunk >> 18) & 0x3F]);
        result.push(SHIFT_ARRAY[(chunk >> 12) & 0x3F]);

        if (padding < 2) {
            result.push(SHIFT_ARRAY[(chunk >> 6) & 0x3F]);
        }
        if (padding < 1) {
            result.push(SHIFT_ARRAY[chunk & 0x3F]);
        }
    }

    return result.join('');
}

/**
 * Convert hex string to byte array
 */
function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

// Main - CLI interface
const url = process.argv[2];
const userAgent = process.argv[3] || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

if (!url) {
    console.error('Usage: node xbogus.mjs "<url>" [userAgent]');
    process.exit(1);
}

const signature = generateXBogus(url, userAgent);
console.log(signature);
