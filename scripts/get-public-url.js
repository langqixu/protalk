#!/usr/bin/env node

const { exec } = require('child_process');
const http = require('http');

console.log('🌐 获取公网地址选项：\n');

// 方法1: 使用 localtunnel
async function tryLocaltunnel() {
  return new Promise((resolve) => {
    console.log('1. 尝试使用 localtunnel...');
    
    const lt = exec('lt --port 3000 --print-requests', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ localtunnel 启动失败');
        resolve(null);
        return;
      }
    });

    // 等待5秒检查是否成功
    setTimeout(() => {
      lt.kill();
      console.log('   ⏳ 请检查终端输出获取公网地址');
      resolve('localtunnel');
    }, 5000);
  });
}

// 方法2: 检查是否有可用的公网IP
async function checkPublicIP() {
  return new Promise((resolve) => {
    console.log('2. 检查公网IP...');
    
    const req = http.get('http://ip-api.com/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.status === 'success') {
            console.log(`   ✅ 公网IP: ${result.query}`);
            console.log(`   📍 位置: ${result.city}, ${result.country}`);
            console.log(`   💡 如果路由器支持端口转发，可以配置端口转发到 3000`);
            resolve(result.query);
          } else {
            console.log('   ❌ 无法获取公网IP');
            resolve(null);
          }
        } catch (e) {
          console.log('   ❌ 解析公网IP失败');
          resolve(null);
        }
      });
    });
    
    req.on('error', () => {
      console.log('   ❌ 无法连接到IP查询服务');
      resolve(null);
    });
    
    req.setTimeout(5000, () => {
      console.log('   ⏰ 获取公网IP超时');
      resolve(null);
    });
  });
}

// 方法3: 使用 ngrok (需要认证)
async function checkNgrok() {
  return new Promise((resolve) => {
    console.log('3. 检查 ngrok 状态...');
    
    exec('ngrok version', (error, stdout) => {
      if (error) {
        console.log('   ❌ ngrok 未安装或不可用');
        resolve(null);
        return;
      }
      
      console.log('   ✅ ngrok 已安装');
      console.log('   📝 需要注册 ngrok 账号并配置 authtoken');
      console.log('   🔗 注册地址: https://dashboard.ngrok.com/signup');
      console.log('   🔑 配置命令: ngrok config add-authtoken YOUR_TOKEN');
      resolve('ngrok_available');
    });
  });
}

// 方法4: 使用 serveo
async function tryServeo() {
  return new Promise((resolve) => {
    console.log('4. 尝试使用 serveo...');
    
    const ssh = exec('ssh -R 80:localhost:3000 serveo.net -o StrictHostKeyChecking=no', (error) => {
      if (error) {
        console.log('   ❌ serveo 连接失败');
        resolve(null);
      }
    });
    
    setTimeout(() => {
      ssh.kill();
      console.log('   ⏳ serveo 可能需要手动配置');
      resolve('serveo');
    }, 3000);
  });
}

// 主函数
async function main() {
  console.log('🚀 正在尝试获取公网地址...\n');
  
  // 检查本地服务是否运行
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3000/api/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.setTimeout(3000, reject);
    });
    
    if (response.success) {
      console.log('✅ 本地服务运行正常 (http://localhost:3000)\n');
    }
  } catch (error) {
    console.log('❌ 本地服务未运行，请先启动服务: npm run dev\n');
    return;
  }
  
  // 尝试各种方法
  await tryLocaltunnel();
  await checkPublicIP();
  await checkNgrok();
  await tryServeo();
  
  console.log('\n📋 推荐方案：');
  console.log('1. 如果路由器支持端口转发，配置端口转发到 3000');
  console.log('2. 注册 ngrok 账号并使用 ngrok http 3000');
  console.log('3. 使用云服务器部署应用');
  console.log('4. 使用 Vercel、Netlify 等平台部署');
  
  console.log('\n🔧 手动测试命令：');
  console.log('curl -X POST -H "Content-Type: application/json" \\');
  console.log('  -d \'{"name":"飞书测试","url":"YOUR_PUBLIC_URL/feishu/events"}\' \\');
  console.log('  http://localhost:3000/feishu/config-addresses');
}

main().catch(console.error);
