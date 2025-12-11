/**
 * TikTok Console Hooks
 * 
 * Paste these snippets into the browser console to intercept and analyze
 * TikTok's anti-bot SDK behavior.
 * 
 * Usage:
 *   1. Open TikTok in Chrome
 *   2. Open DevTools (F12)
 *   3. Go to Console tab
 *   4. Paste the desired hook
 */

// ============================================================================
// HOOK 1: Intercept Fetch Requests
// ============================================================================
// Logs all fetch requests, especially useful for login/API calls

const _fetch = window.fetch;
window.fetch = async function(url, options) {
    const urlStr = url.toString();
    
    // Filter for interesting endpoints
    if (urlStr.includes('login') || 
        urlStr.includes('passport') || 
        urlStr.includes('api/')) {
        
        console.log('%c=== FETCH REQUEST ===', 'color: #00ff00; font-weight: bold');
        console.log('URL:', urlStr);
        
        if (options) {
            console.log('Method:', options.method || 'GET');
            if (options.headers) {
                console.log('Headers:', options.headers);
            }
            if (options.body) {
                console.log('Body:', options.body);
            }
        }
        
        // Extract X-Bogus from URL if present
        const xbMatch = urlStr.match(/X-Bogus=([^&]+)/);
        if (xbMatch) {
            console.log('X-Bogus:', xbMatch[1]);
        }
        
        console.log('');
    }
    
    return _fetch.apply(this, arguments);
};

console.log('[+] Fetch hook installed');


// ============================================================================
// HOOK 2: Intercept XHR Requests
// ============================================================================
// Some requests use XMLHttpRequest instead of fetch

const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    this._method = method;
    return originalXHROpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(body) {
    if (this._url && (this._url.includes('login') || this._url.includes('passport'))) {
        console.log('%c=== XHR REQUEST ===', 'color: #ffff00; font-weight: bold');
        console.log('Method:', this._method);
        console.log('URL:', this._url);
        if (body) {
            console.log('Body:', body);
        }
        console.log('');
    }
    return originalXHRSend.apply(this, arguments);
};

console.log('[+] XHR hook installed');


// ============================================================================
// HOOK 3: X-Bogus Generation Hook
// ============================================================================
// Intercepts the X-Bogus token generation function
// Note: You need to find the correct VM context first (usually 'n.u.o')

function hookXBogus(vmContext) {
    // vmContext should be something like n.u.o or similar
    if (!vmContext || !vmContext[970] || !vmContext[970].v) {
        console.log('[!] VM context not found. Try finding it first.');
        return;
    }
    
    window._origXBogus = vmContext[970].v;
    vmContext[970].v = function(...args) {
        console.log('%c=== X-BOGUS GENERATION ===', 'color: #ff00ff; font-weight: bold');
        console.log('Input args:', args);
        
        const result = window._origXBogus.apply(this, args);
        
        console.log('Output:', result);
        console.log('');
        
        return result;
    };
    
    console.log('[+] X-Bogus hook installed');
}

// Usage: hookXBogus(n.u.o)  // Replace n.u.o with actual VM context


// ============================================================================
// HOOK 4: X-Gnarly Generation Hook
// ============================================================================

function hookXGnarly(vmContext) {
    if (!vmContext || !vmContext[971] || !vmContext[971].v) {
        console.log('[!] VM context not found');
        return;
    }
    
    window._origXGnarly = vmContext[971].v;
    vmContext[971].v = function(...args) {
        console.log('%c=== X-GNARLY GENERATION ===', 'color: #00ffff; font-weight: bold');
        console.log('Input args:', args);
        
        const result = window._origXGnarly.apply(this, args);
        
        console.log('Output:', result);
        console.log('');
        
        return result;
    };
    
    console.log('[+] X-Gnarly hook installed');
}


// ============================================================================
// HOOK 5: VM Execution Tracer
// ============================================================================
// Tracks which opcodes are executed (can generate a lot of output!)

window.vmTrace = [];
window.vmTraceEnabled = false;

function enableVMTrace() {
    window.vmTraceEnabled = true;
    window.vmTrace = [];
    console.log('[+] VM tracing enabled. Trigger an action, then call getVMTrace()');
}

function disableVMTrace() {
    window.vmTraceEnabled = false;
    console.log('[+] VM tracing disabled. Captured', window.vmTrace.length, 'opcodes');
}

function getVMTrace() {
    console.log('Captured opcodes:', window.vmTrace.length);
    console.log('Unique opcodes:', [...new Set(window.vmTrace)].length);
    return window.vmTrace;
}


// ============================================================================
// UTILITY: X-Bogus Decoder
// ============================================================================
// Decodes X-Bogus tokens to see their internal structure

window.xbDecode = function(str) {
    const alphabet = "Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=";
    let result = [];
    
    for (let i = 0; i < str.length; i += 4) {
        const a = alphabet.indexOf(str[i]);
        const b = alphabet.indexOf(str[i + 1]);
        const c = alphabet.indexOf(str[i + 2]);
        const d = alphabet.indexOf(str[i + 3]);
        
        result.push((a << 2) | (b >> 4));
        if (c !== 64) result.push(((b & 15) << 4) | (c >> 2));
        if (d !== 64) result.push(((c & 3) << 6) | d);
    }
    
    return new Uint8Array(result);
};

window.xbAnalyze = function(token) {
    const decoded = xbDecode(token);
    
    console.log('%c=== X-BOGUS ANALYSIS ===', 'color: #ff8800; font-weight: bold');
    console.log('Token:', token);
    console.log('Decoded length:', decoded.length, 'bytes');
    console.log('Magic header:', Array.from(decoded.slice(0, 5)));
    console.log('Payload (MD5):', Array.from(decoded.slice(5)));
    console.log('');
    
    // Check for known magic header
    const expectedMagic = [2, 255, 45, 37, 110];
    const actualMagic = Array.from(decoded.slice(0, 5));
    const magicMatches = JSON.stringify(expectedMagic) === JSON.stringify(actualMagic);
    console.log('Magic header matches:', magicMatches ? 'YES' : 'NO');
    
    return decoded;
};

console.log('[+] X-Bogus decoder available: xbDecode(token), xbAnalyze(token)');


// ============================================================================
// UTILITY: Credential Encoder (for testing)
// ============================================================================
// Replicates TikTok's credential encoding for verification

window.encodePassword = function(password) {
    const key = "@REB";
    let encoded = "71607671";
    
    for (let i = 0; i < password.length; i++) {
        const xored = password.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        encoded += xored.toString(16).padStart(2, '0');
    }
    
    return encoded;
};

window.decodePassword = function(encoded) {
    if (!encoded.startsWith("71607671")) {
        console.log('[!] Invalid prefix');
        return null;
    }
    
    const key = "@REB";
    const hex = encoded.slice(8);
    let decoded = "";
    
    for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.slice(i, i + 2), 16);
        decoded += String.fromCharCode(byte ^ key.charCodeAt((i/2) % key.length));
    }
    
    return decoded;
};

console.log('[+] Credential encoder available: encodePassword(pw), decodePassword(enc)');


// ============================================================================
// QUICK TEST
// ============================================================================

console.log('');
console.log('%c[+] All hooks loaded!', 'color: #00ff00; font-weight: bold');
console.log('');
console.log('Available functions:');
console.log('  - hookXBogus(vmContext)   : Hook X-Bogus generation');
console.log('  - hookXGnarly(vmContext)  : Hook X-Gnarly generation');
console.log('  - enableVMTrace()         : Start tracing VM opcodes');
console.log('  - disableVMTrace()        : Stop tracing');
console.log('  - getVMTrace()            : Get captured opcodes');
console.log('  - xbDecode(token)         : Decode X-Bogus to bytes');
console.log('  - xbAnalyze(token)        : Analyze X-Bogus structure');
console.log('  - encodePassword(pw)      : Encode password like TikTok');
console.log('  - decodePassword(enc)     : Decode encoded password');
console.log('');
