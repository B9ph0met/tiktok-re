/**
 * TikTok Search Automation with Playwright
 * 
 * This script demonstrates using a real browser to bypass TikTok's anti-bot protection.
 * Since Playwright runs actual Chrome, all fingerprints are legitimate and X-Bogus
 * is generated automatically by TikTok's webmssdk.js.
 * 
 * Setup:
 *   npm init -y
 *   npm install playwright
 *   npx playwright install chromium
 * 
 * Usage:
 *   node tiktok_search.js "search query"
 *   node tiktok_search.js gamerman
 */

const { chromium } = require('playwright');

// Configuration
const CONFIG = {
    headless: false,  // Set to true for invisible browser, false to watch it work
    slowMo: 100,      // Slow down actions by 100ms (helps avoid detection)
    timeout: 30000,   // 30 second timeout
};

/**
 * Search for users on TikTok
 */
async function searchTikTok(query) {
    console.log('===========================================');
    console.log('  TikTok Search with Playwright');
    console.log('===========================================\n');

    // Launch browser
    console.log('[1] Launching Chrome...');
    const browser = await chromium.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo,
        args: [
            '--disable-blink-features=AutomationControlled',  // Hide automation
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ]
    });

    // Create context with realistic viewport
    const context = await browser.newContext({
        viewport: { width: 1728, height: 1117 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/Los_Angeles',
    });

    const page = await context.newPage();

    // Capture network requests to see X-Bogus being added
    const apiRequests = [];
    page.on('request', request => {
        const url = request.url();
        if (url.includes('/api/search/') && url.includes('X-Bogus')) {
            apiRequests.push({
                url: url,
                xBogus: url.match(/X-Bogus=([^&]+)/)?.[1],
                xGnarly: url.match(/X-Gnarly=([^&]+)/)?.[1],
            });
            console.log('\n    [Captured] API request with X-Bogus');
        }
    });

    try {
        // Navigate to TikTok
        console.log('[2] Navigating to TikTok...');
        await page.goto('https://www.tiktok.com', { 
            waitUntil: 'networkidle',
            timeout: CONFIG.timeout 
        });
        console.log('    Page loaded');

        // Wait for page to fully initialize (let webmssdk.js load)
        await page.waitForTimeout(2000);

        // Go to search page
        console.log(`[3] Searching for "${query}"...`);
        const searchUrl = `https://www.tiktok.com/search/user?q=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { 
            waitUntil: 'networkidle',
            timeout: CONFIG.timeout 
        });

        // Wait for results to load
        await page.waitForTimeout(3000);

        // Extract user results
        console.log('[4] Extracting results...');
        
        const users = await page.evaluate(() => {
            const results = [];
            
            // Find user cards (TikTok's class names change, so we look for data patterns)
            const userLinks = document.querySelectorAll('a[href*="/@"]');
            const seen = new Set();
            
            userLinks.forEach(link => {
                const href = link.getAttribute('href');
                const username = href?.match(/\/@([^/?]+)/)?.[1];
                
                if (username && !seen.has(username)) {
                    seen.add(username);
                    
                    // Try to get additional info
                    const container = link.closest('[class*="user"]') || link.parentElement?.parentElement;
                    const nickname = container?.querySelector('[class*="name"], [class*="title"]')?.textContent;
                    const followers = container?.querySelector('[class*="follower"]')?.textContent;
                    
                    results.push({
                        username: username,
                        nickname: nickname || '',
                        followers: followers || '',
                        url: `https://www.tiktok.com/@${username}`
                    });
                }
            });
            
            return results.slice(0, 10);  // Return first 10
        });

        // Display results
        console.log('\n[5] Results:');
        console.log('-------------------------------------------');
        
        if (users.length === 0) {
            console.log('    No users found (page might need more time to load)');
        } else {
            users.forEach((user, i) => {
                console.log(`    ${i + 1}. @${user.username}`);
                if (user.nickname) console.log(`       Name: ${user.nickname}`);
                if (user.followers) console.log(`       Followers: ${user.followers}`);
            });
        }

        // Show captured X-Bogus
        console.log('\n[6] Captured X-Bogus tokens:');
        console.log('-------------------------------------------');
        if (apiRequests.length === 0) {
            console.log('    No API requests captured yet');
        } else {
            apiRequests.forEach((req, i) => {
                console.log(`    Request ${i + 1}:`);
                console.log(`      X-Bogus: ${req.xBogus}`);
                if (req.xGnarly) {
                    console.log(`      X-Gnarly: ${req.xGnarly.substring(0, 50)}...`);
                }
            });
        }

        // Get cookies for reference
        const cookies = await context.cookies();
        console.log('\n[7] Session cookies:');
        console.log('-------------------------------------------');
        const importantCookies = ['msToken', 'ttwid', 'tt_csrf_token', 's_v_web_id'];
        importantCookies.forEach(name => {
            const cookie = cookies.find(c => c.name === name);
            if (cookie) {
                console.log(`    ${name}: ${cookie.value.substring(0, 30)}...`);
            }
        });

        // Optional: Take screenshot
        await page.screenshot({ path: 'tiktok_search_result.png' });
        console.log('\n[8] Screenshot saved to tiktok_search_result.png');

        return users;

    } catch (error) {
        console.error('\n[ERROR]', error.message);
        
        // Take screenshot on error for debugging
        await page.screenshot({ path: 'tiktok_error.png' });
        console.log('    Error screenshot saved to tiktok_error.png');
        
        return [];
    } finally {
        // Keep browser open for inspection if not headless
        if (!CONFIG.headless) {
            console.log('\n[*] Browser will close in 10 seconds...');
            console.log('    (Set headless: true in CONFIG to run invisibly)');
            await page.waitForTimeout(10000);
        }
        
        await browser.close();
        console.log('\n===========================================');
    }
}

/**
 * Intercept and log X-Bogus generation (advanced)
 * This hooks into the page to see X-Bogus being generated
 */
async function searchWithXBogusLogging(query) {
    console.log('===========================================');
    console.log('  TikTok Search with X-Bogus Logging');
    console.log('===========================================\n');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 50,
    });

    const context = await browser.newContext({
        viewport: { width: 1728, height: 1117 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // Inject our hook BEFORE page loads
    await page.addInitScript(() => {
        // Store original fetch
        const originalFetch = window.fetch;
        
        // Override fetch to log X-Bogus
        window.fetch = async function(...args) {
            const url = args[0]?.toString() || '';
            
            if (url.includes('X-Bogus')) {
                const xBogus = url.match(/X-Bogus=([^&]+)/)?.[1];
                console.log('[X-Bogus Intercepted]', xBogus);
                
                // Store for later access
                window.__xbogusLog = window.__xbogusLog || [];
                window.__xbogusLog.push({
                    url: url,
                    xBogus: xBogus,
                    timestamp: Date.now()
                });
            }
            
            return originalFetch.apply(this, args);
        };
        
        console.log('[Hook] Fetch interceptor installed');
    });

    try {
        console.log('[1] Loading TikTok with hooks...');
        await page.goto('https://www.tiktok.com', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        console.log(`[2] Searching for "${query}"...`);
        await page.goto(`https://www.tiktok.com/search/user?q=${encodeURIComponent(query)}`, {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(3000);

        // Get logged X-Bogus values
        const logs = await page.evaluate(() => window.__xbogusLog || []);
        
        console.log('\n[3] X-Bogus tokens generated by browser:');
        console.log('-------------------------------------------');
        logs.forEach((log, i) => {
            console.log(`    ${i + 1}. ${log.xBogus}`);
        });

        // Extract and return users
        const users = await page.evaluate(() => {
            const results = [];
            const userLinks = document.querySelectorAll('a[href*="/@"]');
            const seen = new Set();
            
            userLinks.forEach(link => {
                const username = link.getAttribute('href')?.match(/\/@([^/?]+)/)?.[1];
                if (username && !seen.has(username)) {
                    seen.add(username);
                    results.push({ username });
                }
            });
            
            return results.slice(0, 10);
        });

        console.log('\n[4] Users found:');
        users.forEach((u, i) => console.log(`    ${i + 1}. @${u.username}`));

        return users;

    } finally {
        await page.waitForTimeout(5000);
        await browser.close();
        console.log('\n===========================================');
    }
}

// Main
const query = process.argv[2] || 'gamerman';

// Run the search
searchTikTok(query).then(users => {
    console.log(`\nFound ${users.length} users for query "${query}"`);
});

// Uncomment to use the version with X-Bogus logging:
// searchWithXBogusLogging(query);
