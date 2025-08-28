#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/feishu';

async function testConfigAddresses() {
  console.log('🚀 开始测试配置地址管理功能...\n');

  try {
    // 1. 获取配置地址列表（初始状态）
    console.log('1. 获取配置地址列表（初始状态）');
    const initialList = await axios.get(`${BASE_URL}/config-addresses`);
    console.log(`   结果: ${initialList.data.total} 个配置地址\n`);

    // 2. 添加配置地址
    console.log('2. 添加配置地址');
    const newConfig = await axios.post(`${BASE_URL}/config-addresses`, {
      name: '测试配置1',
      url: 'https://httpbin.org/get',
      description: '用于测试的配置地址1'
    });
    console.log(`   结果: ${newConfig.data.message}`);
    console.log(`   ID: ${newConfig.data.data.id}\n`);

    // 3. 添加第二个配置地址
    console.log('3. 添加第二个配置地址');
    const newConfig2 = await axios.post(`${BASE_URL}/config-addresses`, {
      name: '测试配置2',
      url: 'https://httpbin.org/status/200',
      description: '用于测试的配置地址2'
    });
    console.log(`   结果: ${newConfig2.data.message}`);
    console.log(`   ID: ${newConfig2.data.data.id}\n`);

    // 4. 获取配置地址列表（添加后）
    console.log('4. 获取配置地址列表（添加后）');
    const listAfterAdd = await axios.get(`${BASE_URL}/config-addresses`);
    console.log(`   结果: ${listAfterAdd.data.total} 个配置地址`);
    listAfterAdd.data.data.forEach((config, index) => {
      console.log(`   ${index + 1}. ${config.name} - ${config.url}`);
    });
    console.log();

    // 5. 获取单个配置地址详情
    console.log('5. 获取单个配置地址详情');
    const configDetail = await axios.get(`${BASE_URL}/config-addresses/${newConfig.data.data.id}`);
    console.log(`   结果: ${configDetail.data.data.name} - ${configDetail.data.data.description}\n`);

    // 6. 更新配置地址
    console.log('6. 更新配置地址');
    const updatedConfig = await axios.put(`${BASE_URL}/config-addresses/${newConfig.data.data.id}`, {
      name: '更新后的测试配置1',
      description: '更新后的描述信息'
    });
    console.log(`   结果: ${updatedConfig.data.message}\n`);

    // 7. 测试配置地址连接
    console.log('7. 测试配置地址连接');
    const testResult = await axios.post(`${BASE_URL}/config-addresses/${newConfig.data.data.id}/test`);
    console.log(`   结果: ${testResult.data.message}`);
    console.log(`   状态: ${testResult.data.data.status}\n`);

    // 8. 测试无效URL验证
    console.log('8. 测试无效URL验证');
    try {
      await axios.post(`${BASE_URL}/config-addresses`, {
        name: '无效配置',
        url: 'invalid-url',
        description: '测试无效URL'
      });
    } catch (error) {
      console.log(`   结果: ${error.response.data.error}\n`);
    }

    // 9. 测试重复URL验证
    console.log('9. 测试重复URL验证');
    try {
      await axios.post(`${BASE_URL}/config-addresses`, {
        name: '重复配置',
        url: 'https://httpbin.org/get',
        description: '测试重复URL'
      });
    } catch (error) {
      console.log(`   结果: ${error.response.data.error}\n`);
    }

    // 10. 删除配置地址
    console.log('10. 删除配置地址');
    const deleteResult = await axios.delete(`${BASE_URL}/config-addresses/${newConfig.data.data.id}`);
    console.log(`   结果: ${deleteResult.data.message}\n`);

    // 11. 获取最终配置地址列表
    console.log('11. 获取最终配置地址列表');
    const finalList = await axios.get(`${BASE_URL}/config-addresses`);
    console.log(`   结果: ${finalList.data.total} 个配置地址`);
    finalList.data.data.forEach((config, index) => {
      console.log(`   ${index + 1}. ${config.name} - ${config.url}`);
    });
    console.log();

    // 12. 清理剩余配置
    console.log('12. 清理剩余配置');
    for (const config of finalList.data.data) {
      await axios.delete(`${BASE_URL}/config-addresses/${config.id}`);
      console.log(`   删除: ${config.name}`);
    }
    console.log();

    console.log('✅ 所有测试完成！配置地址管理功能正常工作。');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testConfigAddresses();
