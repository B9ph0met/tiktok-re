# TikTok Reverse Engineering

Tools for analyzing TikTok's web anti-bot system and searching users via the private API.

## tiktok-search

User search implementation with working X-Bogus and X-Gnarly signature generation.

```bash
cd tiktok-search
npm install
node search.js "gaming"
```

Batch scraping:
```bash
# add keywords to targets.txt (one per line)
node scraper.js
```

### Files

- `xbogus.js` - X-Bogus signature (RC4 + MD5 + custom Base64)
- `xgnarly.js` - X-Gnarly signature (ChaCha encryption)
- `search.js` - single user search
- `scraper.js` - batch scraper with proxy support

## decrypt

Babel transforms to deobfuscate `webmssdk.js`.

```bash
cd decrypt
npm install
```

Grab `webmssdk.js` from TikTok (Network tab → filter "webmssdk") and drop it in the folder, then:

```bash
node deobf.js
```

Output goes to `output.js`.

### What the transforms do

| Before | After |
|--------|-------|
| `!0`, `!1` | `true`, `false` |
| `void 0` | `undefined` |
| `0x15e` | `350` |
| `5 * 10 + 2` | `52` |
| `obj["prop"]` | `obj.prop` |
| `"he" + "llo"` | `"hello"` |

## How the signatures work

**X-Bogus**: Hashes the URL params and user-agent, builds a byte array with timestamps and magic numbers, scrambles it, RC4 encrypts, then Base64 encodes with a custom alphabet.

**X-Gnarly**: MD5 hashes the query string/body/user-agent, builds a versioned payload, encrypts with ChaCha using a random key derived from a custom PRNG, embeds the key in the output, and Base64 encodes.

Both are required for API requests to pass TikTok's bot detection.

## License

MIT