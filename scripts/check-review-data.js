#!/usr/bin/env node

/**
 * 检查数据库中的评论数据状态
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
        'Content-Type': 'application/json'
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

async function checkReviewData() {
  try {
    console.log('📋 检查数据库中的评论数据...\n');
    
    // 创建一个测试端点来查看最新评论的状态
    const testEndpoint = '/feishu/status';
    const status = await makeRequest(testEndpoint);
    
    console.log('📊 服务状态:', status);
    
    console.log('\n💡 建议:');
    console.log('1. 检查最新推送的测试卡片是否显示了输入框');
    console.log('2. 如果没有，说明测试数据中所有评论都有developer_response');
    console.log('3. 我们需要创建一个真正没有回复的测试评论');
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkReviewData().then(() => {
  console.log('\n🎉 检查完成');
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
});
