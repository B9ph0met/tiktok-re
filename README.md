# TikTok Web Reverse Engineering

Tools and scripts for analyzing TikTok's web-based anti-bot protection system.

## Overview

This repository contains:

- **tiktok-search** - Working implementation of TikTok's user search API with X-Bogus and X-Gnarly signatures
- **Babel deobfuscation scripts** for making `webmssdk.js` readable
- **Go scripts** for testing HTTP requests and analyzing responses
- **Console hooks** for runtime analysis in the browser

## Structure

```
tiktok-re/
├── decrypt/
│   ├── deobf.js          # Babel deobfuscation script
│   ├── webmssdk.js       # Original SDK (not included, download yourself)
│   └── output.js         # Deobfuscated output
├── tiktok-search/
│   ├── search.mjs        # Complete user search implementation
│   ├── xbogus.mjs        # X-Bogus signature generator (native implementation)
│   └── xgnarly.mjs       # X-Gnarly signature generator (ChaCha-based)
├── playwright/
│   └── tiktok_search.js  # Browser-based search using Playwright
├── scripts/
│   ├── get_cookies.go    # Fetch initial cookies from TikTok
│   ├── get_search.go     # Search API testing
│   └── tls_check.go      # Test TLS fingerprinting behavior
├── hooks/
│   └── console_hooks.js  # Browser console hooks for runtime analysis
└── README.md
```

## Setup

### Deobfuscation

```bash
cd decrypt
npm install
```

Download `webmssdk.js` from TikTok (check Network tab when loading any TikTok page) and place it in the `decrypt/` folder.

Run the deobfuscator:

```bash
node deobf.js
```

This outputs a more readable version to `output.js`.

### TikTok Search

```bash
cd tiktok-search
npm install
node search.mjs <keyword>
```

Example:

```bash
node search.mjs gamergirl
```

## How the Scraper Works

The scraper bypasses TikTok's anti-bot protection by generating valid cryptographic signatures. Here's the complete flow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TikTok Search Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. GET /api/recommend/item_list/?aid=1988                                  │
│     └──► Extract msToken from Set-Cookie header                             │
│                                                                             │
│  2. GET /search?q=test                                                      │
│     └──► Extract cookies (tt_chain_token, ttwid, etc.)                      │
│     └──► Parse device_id and odin_id from HTML response                     │
│                                                                             │
│  3. Build search URL with 30+ parameters                                    │
│     └──► aid, device_id, keyword, msToken, browser info, etc.               │
│                                                                             │
│  4. Generate X-Bogus signature                                              │
│     └──► Input: full URL + user-agent                                       │
│     └──► Output: ~28 char signature (e.g., "DFSzswVOyGIANVt9SBOmfK3T")      │
│                                                                             │
│  5. Generate X-Gnarly signature                                             │
│     └──► Input: query string + user-agent                                   │
│     └──► Output: ~200 char ChaCha-encrypted signature                       │
│                                                                             │
│  6. GET /api/search/user/full/?...&X-Bogus=...&X-Gnarly=...                 │
│     └──► Include all cookies and headers                                    │
│     └──► Receive JSON response with user data                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **msToken** | Session token from TikTok, required for API requests |
| **device_id** | 19-digit device identifier extracted from page HTML |
| **odin_id** | Additional device identifier for tracking |
| **X-Bogus** | Request integrity signature (RC4 + custom Base64) |
| **X-Gnarly** | Secondary signature using ChaCha encryption |

### X-Bogus Algorithm

The X-Bogus signature is generated using a fully reverse-engineered native implementation:

1. **Double MD5** - Hash the URL params and body with `MD5(MD5(data))`
2. **User-Agent Hash** - RC4 encrypt the UA, custom Base64 encode, then MD5
3. **Build Data Array** - Combine timestamp, magic number (`536919696`), and hash bytes
4. **Filter & Scramble** - Reorder bytes using predefined index patterns
5. **RC4 Encrypt** - Final encryption pass with key `[255]`
6. **Custom Base64** - Encode using TikTok's alphabet: `Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe`

No external dependencies required for signature generation.

### X-Gnarly Algorithm

X-Gnarly uses ChaCha stream cipher encryption with a custom protocol:

1. **Build Payload Map** - Create key-value pairs:
   - MD5 hashes of query string, body, and user-agent
   - Timestamp (seconds and microseconds)
   - Version info (`5.1.1`, `1.0.0.314`)
   - XOR checksum of all numeric values

2. **Serialize** - Convert map to binary format with length-prefixed values

3. **Generate Key** - Use ChaCha-based PRNG to generate 12 random 32-bit words

4. **Encrypt** - ChaCha encrypt the payload with dynamic round count (5-20 rounds based on key)

5. **Encode** - Custom Base64 with alphabet: `u09tbS3UvgDEe6r-ZVMXzLpsAohTn7mdINQlW412GqBjfYiyk8JORCF5/xKHwacP=`

### Standalone Signature Generators

You can also use the signature generators standalone:

```bash
# X-Bogus
node xbogus.mjs "<full_url>" "<user_agent>"

# X-Gnarly
node xgnarly.mjs "<query_string>" "<user_agent>"
```

### Playwright

Browser-based approach using Playwright to extract signatures from a real browser context:

```bash
cd playwright
npm install
node tiktok_search.js <keyword>
```

### Go Scripts

```bash
cd scripts
go run get_cookies.go
go run get_search.go
```

## Getting webmssdk.js

1. Open https://www.tiktok.com with DevTools open
2. Go to Network tab
3. Filter by "webmssdk"
4. Copy the response content
5. Save as `decrypt/webmssdk.js`

## Deobfuscation Transforms

The `deobf.js` script applies these transforms:

| Transform | Before | After |
|-----------|--------|-------|
| Boolean literals | `!0`, `!1` | `true`, `false` |
| Undefined | `void 0` | `undefined` |
| Hex numbers | `0x15e` | `350` |
| Constant folding | `5 * 10 + 2` | `52` |
| Computed properties | `obj["prop"]` | `obj.prop` |
| String concatenation | `"he" + "llo"` | `"hello"` |

## Console Hooks

Paste these in the browser console to intercept SDK behavior:

```javascript
// Hook X-Bogus generation
window.orig970 = n.u.o[970].v;
n.u.o[970].v = function(...args) {
    console.log('X-Bogus inputs:', args);
    const result = window.orig970.apply(this, args);
    console.log('X-Bogus output:', result);
    return result;
};
```

See `hooks/console_hooks.js` for more.

## What You Can Learn

After deobfuscation, you can identify:

- **VM Structure**: 349 opcodes, bytecode interpretation loop
- **Key Functions**: `i.o[970].v` (X-Bogus), `i.o[971].v` (X-Gnarly)
- **Bot Detection Flags**: Mouse movement, keyboard timing, synthetic events
- **Fingerprint Collection**: Canvas, WebGL, screen, navigator properties

## Disclaimer

This repository is for educational purposes only. Understanding protection mechanisms helps build better security systems.

## License

MIT
