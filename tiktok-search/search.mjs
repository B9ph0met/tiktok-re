/**
 * TikTok User Search
 * 
 * Flow:
 * 1. GET /api/recommend/item_list/?aid=1988 → get msToken from Set-Cookie
 * 2. Build search URL with all parameters
 * 3. Generate X-Bogus (using xbogus.mjs)
 * 4. Generate X-Gnarly (using xgnarly.mjs)
 * 5. Make the search request with curl
 * 
 * Usage:
 *   node search.mjs <keyword>
 * 
 * Example:
 *   node search.mjs gamergirl
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ============================================================================
// STEP 1: Get msToken
// ============================================================================
function getMsToken() {
  console.log('Step 1: Getting msToken...');
  
  const result = execSync(
    `curl -s -D - 'https://www.tiktok.com/api/recommend/item_list/?aid=1988' -H 'User-Agent: ${USER_AGENT}'`,
    { encoding: 'utf-8' }
  );
  
  const match = result.match(/set-cookie:\s*msToken=([^;]+)/i);
  if (!match) {
    throw new Error('Failed to get msToken');
  }
  
  const msToken = match[1];
  console.log(`   ✓ msToken: ${msToken.substring(0, 30)}...`);
  return msToken;
}

// ============================================================================
// STEP 2: Get initial cookies and device IDs
// ============================================================================
function getSessionData() {
  console.log('\nStep 2: Getting session data...');
  
  // Get cookies from tiktok.com
  const result = execSync(
    `curl -s -D - 'https://www.tiktok.com/search?q=test' -H 'User-Agent: ${USER_AGENT}'`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
  );
  
  // Extract cookies from headers
  const cookies = {};
  const cookieMatches = result.matchAll(/set-cookie:\s*([^=]+)=([^;]+)/gi);
  for (const m of cookieMatches) {
    cookies[m[1]] = m[2];
  }
  
  console.log(`   ✓ Cookies: ${Object.keys(cookies).join(', ')}`);
  
  // Extract device_id and odinId from HTML body
  const deviceIdMatch = result.match(/"device_id":"(\d+)"/);
  const odinIdMatch = result.match(/"odin_id":"(\d+)"/);
  
  const deviceId = deviceIdMatch ? deviceIdMatch[1] : generateId();
  const odinId = odinIdMatch ? odinIdMatch[1] : generateId();
  
  console.log(`   ✓ device_id: ${deviceId}`);
  console.log(`   ✓ odinId: ${odinId}`);
  
  return { cookies, deviceId, odinId };
}

function generateId() {
  return '7' + Math.random().toString().slice(2, 20).padEnd(18, '0');
}

// ============================================================================
// STEP 3: Build URL
// ============================================================================
function buildSearchURL(keyword, msToken, deviceId, odinId) {
  console.log('\nStep 3: Building URL...');
  
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
    'tz_name': 'America/Boise',
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
  
  const queryString = params.toString();
  const baseURL = `https://www.tiktok.com/api/search/user/full/?${queryString}`;
  
  console.log(`   ✓ Base URL: ${baseURL.length} chars`);
  
  return { baseURL, queryString };
}

// ============================================================================
// STEP 4: Generate signatures
// ============================================================================
function generateSignatures(baseURL, queryString) {
  console.log('\nStep 4: Generating signatures...');
  
  // Generate X-Bogus
  const xbogusPath = join(__dirname, 'xbogus.mjs');
  const xBogus = execSync(
    `node "${xbogusPath}" "${baseURL}" "${USER_AGENT}"`,
    { encoding: 'utf-8' }
  ).trim();
  console.log(`   ✓ X-Bogus: ${xBogus}`);
  
  // Generate X-Gnarly
  const xgnarlyPath = join(__dirname, 'xgnarly.mjs');
  const xGnarly = execSync(
    `node "${xgnarlyPath}" "${queryString}" "${USER_AGENT}"`,
    { encoding: 'utf-8' }
  ).trim();
  console.log(`   ✓ X-Gnarly: ${xGnarly.substring(0, 40)}...`);
  
  return { xBogus, xGnarly };
}

// ============================================================================
// STEP 5: Make request
// ============================================================================
function makeRequest(baseURL, xBogus, xGnarly, cookies, keyword) {
  console.log('\nStep 5: Making request...');
  
  const signedURL = `${baseURL}&X-Bogus=${encodeURIComponent(xBogus)}&X-Gnarly=${encodeURIComponent(xGnarly)}`;
  
  // Build cookie string
  const cookieStr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  
  // Use curl to make the request (preserves exact URL encoding)
  const curlCmd = `curl -s '${signedURL}' \
    -H 'User-Agent: ${USER_AGENT}' \
    -H 'Accept: */*' \
    -H 'Accept-Language: en-US,en;q=0.9' \
    -H 'Referer: https://www.tiktok.com/search/user?q=${encodeURIComponent(keyword)}' \
    -H 'sec-ch-ua: "Google Chrome";v="131", "Chromium";v="131"' \
    -H 'sec-ch-ua-mobile: ?0' \
    -H 'sec-ch-ua-platform: "macOS"' \
    -H 'sec-fetch-dest: empty' \
    -H 'sec-fetch-mode: cors' \
    -H 'sec-fetch-site: same-origin' \
    -H 'Cookie: ${cookieStr}'`;
  
  const response = execSync(curlCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  
  console.log(`   ✓ Response: ${response.length} bytes`);
  
  return response;
}

// ============================================================================
// STEP 6: Parse response
// ============================================================================
function parseResponse(response) {
  console.log('\n' + '='.repeat(50));
  
  if (!response || response.length === 0) {
    console.log('❌ Empty response');
    return;
  }
  
  try {
    const data = JSON.parse(response);
    
    if (data.status_msg) {
      console.log(`⚠️  API Error: ${data.status_msg}`);
      return;
    }
    
    if (data.user_list && data.user_list.length > 0) {
      console.log(`✅ Found ${data.user_list.length} users!\n`);
      
      data.user_list.slice(0, 5).forEach((item, i) => {
        const user = item.user_info;
        console.log(`${i + 1}. @${user.unique_id}`);
        console.log(`   ${user.nickname}`);
        console.log(`   ${(user.follower_count || 0).toLocaleString()} followers\n`);
      });
    } else {
      console.log('No users found');
      console.log('Response:', response.substring(0, 300));
    }
  } catch (e) {
    console.log('Failed to parse response:', e.message);
    console.log('Raw:', response.substring(0, 500));
  }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  const keyword = process.argv[2] || 'gamergirl';
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    TikTok User Search                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n🔍 Searching for: ${keyword}\n`);
  
  try {
    // Step 1: Get msToken
    const msToken = getMsToken();
    
    // Step 2: Get session data (cookies, device IDs)
    const { cookies, deviceId, odinId } = getSessionData();
    
    // Step 3: Build URL
    const { baseURL, queryString } = buildSearchURL(keyword, msToken, deviceId, odinId);
    
    // Step 4: Generate signatures
    const { xBogus, xGnarly } = generateSignatures(baseURL, queryString);
    
    // Step 5: Make request
    const response = makeRequest(baseURL, xBogus, xGnarly, cookies, keyword);
    
    // Step 6: Parse response
    parseResponse(response);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
