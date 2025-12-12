# TikTok Web Reverse Engineering

Tools and scripts for analyzing TikTok's web-based anti-bot protection system.

## Overview

This repository contains:

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
├── scripts/
│   ├── get_cookies.go    # Fetch initial cookies from TikTok
│   └── tls_check.go       # Test TLS fingerprinting behavior
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

### Go Scripts

```bash
cd scripts
go run get_cookies.go
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
