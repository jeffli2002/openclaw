#!/usr/bin/env node
const https = require('https');
const crypto = require('crypto');

// 生成唯一的 sender_id
const SENDER_ID = "node_" + crypto.randomBytes(8).toString('hex');
let NODE_SECRET = null;
console.log("Generated sender_id:", SENDER_ID);

// GEP-A2A 协议请求函数
function a2aRequest(endpoint, payload, authSecret = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'evomap.ai',
      port: 443,
      path: `/a2a/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    // 添加认证头
    if (authSecret) {
      options.headers['Authorization'] = `Bearer ${authSecret}`;
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: json });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const timestamp = new Date().toISOString();
  
  // Step 1: Hello - 注册节点
  console.log("\n📡 Step 1: Sending HELLO to register node...");
  const helloPayload = {
    protocol: "gep-a2a",
    protocol_version: "1.0.0",
    message_type: "hello",
    message_id: "msg_" + Date.now() + "_" + crypto.randomBytes(4).toString('hex'),
    sender_id: SENDER_ID,
    timestamp: timestamp,
    payload: {
      capabilities: {},
      gene_count: 0,
      capsule_count: 0,
      env_fingerprint: {
        platform: process.platform,
        arch: process.arch
      }
    }
  };
  
  try {
    const helloRes = await a2aRequest('hello', helloPayload);
    
    if (helloRes.statusCode === 200 && helloRes.data.payload?.node_secret) {
      NODE_SECRET = helloRes.data.payload.node_secret;
      console.log("✅ Node registered. node_secret obtained.");
      console.log("   Claim code:", helloRes.data.payload.claim_code);
      console.log("   Recommended assets:", helloRes.data.payload.recommended_assets?.length || 0);
    } else {
      console.log("Hello response:", JSON.stringify(helloRes, null, 2));
      return;
    }
  } catch (err) {
    console.error("❌ Hello failed:", err.message);
    return;
  }

  // Step 2: Fetch - 拉取胶囊（带认证）
  console.log("\n📡 Step 2: Sending FETCH with authentication...");
  const fetchPayload = {
    protocol: "gep-a2a",
    protocol_version: "1.0.0",
    message_type: "fetch",
    message_id: "msg_" + Date.now() + "_" + crypto.randomBytes(4).toString('hex'),
    sender_id: SENDER_ID,
    timestamp: new Date().toISOString(),
    payload: {
      asset_type: "Capsule",
      include_tasks: true
    }
  };
  
  try {
    const fetchRes = await a2aRequest('fetch', fetchPayload, NODE_SECRET);
    console.log("\nFetch response status:", fetchRes.statusCode);
    
    // 打印完整的响应结构
    console.log("\n📦 Full response:");
    console.log(JSON.stringify(fetchRes.data, null, 2));
    
    // 检查结果
    if (fetchRes.data?.payload?.assets) {
      const capsules = fetchRes.data.payload.assets.filter(a => a.type === 'Capsule');
      console.log(`\n✅ Found ${capsules.length} capsules`);
      capsules.slice(0, 5).forEach((cap, i) => {
        console.log(`  [${i+1}] ${cap.asset_id?.substring(0, 40)}...`);
        console.log(`      confidence: ${cap.confidence}, streak: ${cap.success_streak || 'N/A'}, score: ${cap.outcome?.score || 'N/A'}`);
      });
      
      // 筛选符合条件的胶囊 (confidence >= 0.9)
      const qualified = capsules.filter(c => c.confidence >= 0.9);
      console.log(`\n🎯 Qualified capsules (confidence >= 0.9): ${qualified.length}`);
    } else {
      console.log("\n⚠️  No assets returned or unexpected structure");
    }
    
    if (fetchRes.data?.payload?.tasks) {
      console.log(`\n✅ Found ${fetchRes.data.payload.tasks.length} tasks`);
    }
  } catch (err) {
    console.error("❌ Fetch failed:", err.message);
  }
}

main().catch(console.error);
