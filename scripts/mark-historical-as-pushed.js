#!/usr/bin/env node

/**
 * 批量标记历史评论为已推送
 * 用于紧急修复重复推送问题
 */

const https = require('https');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'protalk.zeabur.app',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'protalk-emergency-fix/1.0'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          resolve({ raw: responseData, status: res.statusCode });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function markHistoricalAsPushed() {
  try {
    console.log('🚨 执行紧急修复：标记历史评论为已推送...\n');
    
    // 调用后端API执行批量更新
    const result = await makeRequest('/api/emergency/mark-historical-pushed', 'POST', {
      cutoffDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24小时前
      dryRun: false
    });
    
    console.log('✅ 修复结果:', result);
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    
    // 备用方案：直接发送验证请求触发修复逻辑
    console.log('\n🔄 尝试备用方案：触发验证修复...');
    try {
      const verifyResult = await makeRequest('/feishu/verify-deployment', 'POST');
      console.log('📋 验证结果:', verifyResult);
    } catch (verifyError) {
      console.error('❌ 验证修复也失败:', verifyError.message);
    }
  }
}

markHistoricalAsPushed().then(() => {
  console.log('\n🎉 紧急修复执行完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
