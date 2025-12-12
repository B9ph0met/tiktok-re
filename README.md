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

This will:
1. Fetch an msToken from TikTok
2. Get session cookies and device IDs
3. Generate X-Bogus signature (native reverse-engineered implementation)
4. Generate X-Gnarly signature (ChaCha-based encryption)
5. Make an authenticated search request
6. Display matching users

### X-Bogus Algorithm

The X-Bogus signature is generated using a fully reverse-engineered native implementation:

1. **Double MD5** - Hash the URL params and body with `MD5(MD5(data))`
2. **User-Agent Hash** - RC4 encrypt the UA, custom Base64 encode, then MD5
3. **Build Data Array** - Combine timestamp, magic number (`536919696`), and hash bytes
4. **Filter & Scramble** - Reorder bytes using predefined index patterns
5. **RC4 Encrypt** - Final encryption pass with key `[255]`
6. **Custom Base64** - Encode using TikTok's alphabet: `Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe`

No external dependencies required for signature generation.

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
