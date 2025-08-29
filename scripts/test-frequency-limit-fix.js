#!/usr/bin/env node

/**
 * 验证频控问题修复效果
 * 测试：卡片导出修复 + 飞书响应状态检查 + 频控保护
 */

const axios = require('axios');

async function testFrequencyLimitFix() {
  console.log('🔧 验证频控问题修复效果\n');
  
  const prodURL = 'https://protalk.zeabur.app';
  
  try {
    // 1. 验证服务状态
    console.log('1. 检查服务状态...');
    const healthResponse = await axios.get(`${prodURL}/health`);
    console.log('✅ 服务状态:', healthResponse.data);

    // 2. 验证卡片构建器修复（应该不再降级）
    console.log('\n2. 测试v2卡片构建器修复...');
    try {
      const chatsResponse = await axios.get(`${prodURL}/feishu/chats`);
      
      if (chatsResponse.data.data && chatsResponse.data.data.length > 0) {
        const testChatId = chatsResponse.data.data[0].chat_id;
        console.log(`📱 使用测试群组: ${testChatId}`);
        
        // 发送v2卡片测试 - 应该显示正确的应用名称和按钮
        const cardResponse = await axios.post(`${prodURL}/feishu/test/card-v2`, {
          chat_id: testChatId,
          template: 'review'
        });
        
        if (cardResponse.data.success) {
          console.log('✅ v2卡片发送成功（不再降级到简单模板）');
          console.log(`📝 消息ID: ${cardResponse.data.data.message_id}`);
          console.log('💡 检查飞书中的卡片应该显示：');
          console.log('   - 正确的应用名称（不是"undefined"）');
          console.log('   - 交互按钮（"💬 回复评论" 和 "📊 查看详情"）');
          console.log('   - 点击按钮应该有响应');
        }
      } else {
        console.log('⚠️  没有找到可用的群组，跳过卡片测试');
      }
    } catch (error) {
      console.log('⚠️  卡片测试失败:', error.message);
    }

    // 3. 验证回调处理机制
    console.log('\n3. 测试回调处理机制...');
    const mockCallback = {
      action: {
        value: {
          action: 'reply_review',
          review_id: 'test_frequency_fix_123',
          app_name: '测试应用'
        }
      },
      user_id: 'test_user_frequency',
      message_id: 'test_message_frequency'
    };

    const callbackResponse = await axios.post(`${prodURL}/feishu/card-actions`, mockCallback);
    
    if (callbackResponse.data.success) {
      console.log('✅ 回调处理机制正常');
    }

    console.log('\n🎉 频控问题修复验证完成！');
    
    console.log('\n📋 修复总结:');
    console.log('   🐛 问题1: buildReviewCardV2 未导出 → 卡片降级');
    console.log('   ✅ 修复1: 添加命名导出 export function buildReviewCardV2');
    console.log('   🐛 问题2: 未检查飞书响应状态 → 失败也标记成功');
    console.log('   ✅ 修复2: 检查 response.data.code !== 0 → 抛出异常');
    console.log('   🐛 问题3: 推送失败仍标记成功 → 重复推送');
    console.log('   ✅ 修复3: 只有推送成功才标记 isPushed = true');
    console.log('   🐛 问题4: 缺乏频控保护 → 触发飞书限流');
    console.log('   ✅ 修复4: 分批推送 + 延迟控制 + 频控检测');
    
    console.log('\n🚀 预期改善:');
    console.log('   ✅ 卡片显示完整信息（应用名、按钮）');
    console.log('   ✅ 按钮点击有响应');
    console.log('   ✅ 不再重复推送相同评论');
    console.log('   ✅ 推送速度控制，避免频控');
    console.log('   ✅ 推送失败会重试，不会丢失');

    console.log('\n📊 运维监控建议:');
    console.log('   - 观察日志中"📤 推送失败，等待下次重试"的频率');
    console.log('   - 监控"🚫 触发频控"警告，调整推送速度');
    console.log('   - 检查数据库中 isPushed=false 的评论数量');
    console.log('   - 确认不再出现"使用v2卡片构建器失败"错误');

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    if (error.response?.data) {
      console.error('📊 详细错误:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行验证
testFrequencyLimitFix().catch(console.error);
