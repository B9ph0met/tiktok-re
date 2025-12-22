import { execSync } from 'child_process';
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
    proxy: 'rv3.pookyyproxies.com:8888:user-10026896-country-us-plan-luminati:vkusANWiVk',  // e.g. 'host:port' or 'host:port:user:pass'
    concurrency: parseInt(process.argv[2]) || 3,
    delayBetweenRequests: 1000,  // ms
    targetsFile: 'targets.txt',
    resultsFile: 'results.txt',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
};

// Parse proxy string
function parseProxy(proxyStr) {
    const parts = proxyStr.split(':');
    if (parts.length === 4) {
        const [host, port, user, pass] = parts;
        return `http://${user}:${pass}@${host}:${port}`;
    }
    return proxyStr;
}

const PROXY_URL = parseProxy(CONFIG.proxy);

// Stats
const stats = {
    total: 0,
    success: 0,
    failed: 0,
    users: 0,
    startTime: Date.now()
};

/**
 * Get msToken from TikTok API
 */
function getMsToken(useProxy = true) {
    try {
        const proxyArg = useProxy ? `--proxy "${PROXY_URL}"` : '';
        const result = execSync(
            `curl -s -D - ${proxyArg} 'https://www.tiktok.com/api/recommend/item_list/?aid=1988' -H 'User-Agent: ${CONFIG.userAgent}'`,
            { encoding: 'utf-8', timeout: 30000 }
        );
        const match = result.match(/set-cookie:\s*msToken=([^;]+)/i);
        return match ? match[1] : null;
    } catch (e) {
        console.error('Failed to get msToken:', e.message);
        return null;
    }
}

/**
 * Get session cookies
 */
function getSessionCookies(useProxy = true) {
    try {
        const proxyArg = useProxy ? `--proxy "${PROXY_URL}"` : '';
        const result = execSync(
            `curl -s -D - ${proxyArg} 'https://www.tiktok.com/search?q=test' -H 'User-Agent: ${CONFIG.userAgent}'`,
            { encoding: 'utf-8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
        );
        
        const cookies = {};
        const matches = result.matchAll(/set-cookie:\s*([^=]+)=([^;]+)/gi);
        for (const m of matches) {
            cookies[m[1]] = m[2];
        }
        
        const deviceIdMatch = result.match(/"device_id":"(\d+)"/);
        const odinIdMatch = result.match(/"odin_id":"(\d+)"/);
        
        return {
            cookies,
            deviceId: deviceIdMatch ? deviceIdMatch[1] : generateId(),
            odinId: odinIdMatch ? odinIdMatch[1] : generateId()
        };
    } catch (e) {
        console.error('Failed to get cookies:', e.message);
        return null;
    }
}

function generateId() {
    return '7' + Math.random().toString().slice(2, 20).padEnd(18, '0');
}

/**
 * Build search URL
 */
function buildSearchURL(keyword, msToken, deviceId, odinId) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const params = new URLSearchParams({
        'WebIdLastTime': timestamp.toString(),
        'aid': '1988',
        'app_language': 'en',
        'app_name': 'tiktok_web',
        'browser_language': 'en-US',
        'browser_name': 'Mozilla',
        'browser_online': 'true',
        'browser_platform': 'MacIntel',
        'browser_version': '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'channel': 'tiktok_web',
        'cookie_enabled': 'true',
        'count': '10',
        'cursor': '0',
        'data_collection_enabled': 'false',
        'device_id': deviceId,
        'device_platform': 'web_pc',
        'focus_state': 'true',
        'from_page': 'search',
        'history_len': '5',
        'is_fullscreen': 'false',
        'is_non_personalized_search': '0',
        'is_page_visible': 'true',
        'keyword': keyword,
        'odinId': odinId,
        'offset': '0',
        'os': 'mac',
        'priority_region': '',
        'referer': '',
        'region': 'US',
        'screen_height': '1117',
        'screen_width': '1728',
        'tz_name': 'America/Los_Angeles',
        'user_is_login': 'false',
        'web_search_code': JSON.stringify({
            tiktok: {
                client_params_x: {
                    search_engine: {
                        ies_mt_user_live_video_card_use_libra: 1,
                        mt_search_general_user_live_card: 1
                    }
                },
                search_server: {}
            }
        }),
        'webcast_language': 'en',
        'msToken': msToken
    });
    
    return {
        baseURL: `https://www.tiktok.com/api/search/user/full/?${params.toString()}`,
        queryString: params.toString()
    };
}

/**
 * Generate X-Bogus signature
 */
function generateXBogus(url) {
    try {
        const xbogusPath = join(__dirname, 'xbogus.js');
        return execSync(
            `node "${xbogusPath}" "${url}" "${CONFIG.userAgent}"`,
            { encoding: 'utf-8', timeout: 5000 }
        ).trim();
    } catch (e) {
        console.error('X-Bogus generation failed:', e.message);
        return null;
    }
}

/**
 * Generate X-Gnarly signature
 */
function generateXGnarly(queryString) {
    try {
        const xgnarlyPath = join(__dirname, 'xgnarly.js');
        return execSync(
            `node "${xgnarlyPath}" "${queryString}" "${CONFIG.userAgent}"`,
            { encoding: 'utf-8', timeout: 5000 }
        ).trim();
    } catch (e) {
        console.error('X-Gnarly generation failed:', e.message);
        return null;
    }
}

/**
 * Search for a keyword
 */
function searchKeyword(keyword, session, useProxy = true) {
    const { baseURL, queryString } = buildSearchURL(
        keyword, 
        session.msToken, 
        session.deviceId, 
        session.odinId
    );
    
    const xBogus = generateXBogus(baseURL);
    const xGnarly = generateXGnarly(queryString);
    
    if (!xBogus || !xGnarly) {
        return { success: false, error: 'Signature generation failed' };
    }
    
    const signedURL = `${baseURL}&X-Bogus=${encodeURIComponent(xBogus)}&X-Gnarly=${encodeURIComponent(xGnarly)}`;
    
    const cookieStr = Object.entries(session.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    
    try {
        const proxyArg = useProxy ? `--proxy "${PROXY_URL}"` : '';
        const response = execSync(
            `curl -s ${proxyArg} '${signedURL}' ` +
            `-H 'User-Agent: ${CONFIG.userAgent}' ` +
            `-H 'Accept: */*' ` +
            `-H 'Cookie: ${cookieStr}'`,
            { encoding: 'utf-8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
        );
        
        if (!response || response.length === 0) {
            return { success: false, error: 'Empty response' };
        }
        
        const data = JSON.parse(response);
        
        if (data.status_msg) {
            return { success: false, error: data.status_msg };
        }
        
        if (data.user_list && data.user_list.length > 0) {
            const users = data.user_list.map(item => ({
                username: item.user_info.unique_id,
                nickname: item.user_info.nickname,
                followers: item.user_info.follower_count || 0
            }));
            return { success: true, users };
        }
        
        return { success: true, users: [] };
        
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Process a single keyword
 */
async function processKeyword(keyword, session, useProxy) {
    const result = searchKeyword(keyword, session, useProxy);
    
    stats.total++;
    
    if (result.success) {
        stats.success++;
        stats.users += result.users.length;
        
        // Append results to file
        for (const user of result.users) {
            const line = `${keyword}\t@${user.username}\t${user.nickname}\t${user.followers}\n`;
            appendFileSync(CONFIG.resultsFile, line);
        }
        
        return result.users;
    } else {
        stats.failed++;
        console.error(`  [FAIL] ${keyword}: ${result.error}`);
        return [];
    }
}

/**
 * Worker function
 */
async function worker(keywords, workerId, useProxy) {
    console.log(`Worker ${workerId}: Getting session...`);
    
    const msToken = getMsToken(useProxy);
    if (!msToken) {
        console.error(`Worker ${workerId}: Failed to get msToken`);
        return;
    }
    
    const sessionData = getSessionCookies(useProxy);
    if (!sessionData) {
        console.error(`Worker ${workerId}: Failed to get cookies`);
        return;
    }
    
    const session = {
        msToken,
        ...sessionData
    };
    
    console.log(`Worker ${workerId}: Starting with ${keywords.length} keywords`);
    
    for (const keyword of keywords) {
        const users = await processKeyword(keyword, session, useProxy);
        console.log(`  [${workerId}] ${keyword}: ${users.length} users`);
        
        // Refresh msToken periodically
        if (stats.total % 10 === 0) {
            const newToken = getMsToken(useProxy);
            if (newToken) session.msToken = newToken;
        }
        
        // Delay between requests
        await sleep(CONFIG.delayBetweenRequests);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main
 */
async function main() {
    console.log('='.repeat(60));
    console.log('TikTok User Scraper');
    console.log('='.repeat(60));
    console.log(`Concurrency: ${CONFIG.concurrency}`);
    console.log(`Proxy: ${CONFIG.proxy.split(':')[0]}:${CONFIG.proxy.split(':')[1]}`);
    console.log('');
    
    // Load targets
    if (!existsSync(CONFIG.targetsFile)) {
        console.error(`Targets file not found: ${CONFIG.targetsFile}`);
        process.exit(1);
    }
    
    const keywords = readFileSync(CONFIG.targetsFile, 'utf-8')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    
    console.log(`Loaded ${keywords.length} keywords from ${CONFIG.targetsFile}`);
    
    // Initialize results file with header
    writeFileSync(CONFIG.resultsFile, 'keyword\tusername\tnickname\tfollowers\n');
    
    // Split keywords among workers
    const chunkSize = Math.ceil(keywords.length / CONFIG.concurrency);
    const chunks = [];
    for (let i = 0; i < keywords.length; i += chunkSize) {
        chunks.push(keywords.slice(i, i + chunkSize));
    }
    
    console.log(`Starting ${chunks.length} workers...\n`);
    
    // Start workers
    const workers = chunks.map((chunk, i) => worker(chunk, i + 1, true));
    
    await Promise.all(workers);
    
    // Print stats
    const elapsed = (Date.now() - stats.startTime) / 1000;
    console.log('\n' + '='.repeat(60));
    console.log('COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total requests: ${stats.total}`);
    console.log(`Successful: ${stats.success}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Users found: ${stats.users}`);
    console.log(`Time: ${elapsed.toFixed(1)}s`);
    console.log(`Rate: ${(stats.total / elapsed * 60).toFixed(1)} requests/min`);
    console.log(`Results saved to: ${CONFIG.resultsFile}`);
}

main().catch(console.error);
