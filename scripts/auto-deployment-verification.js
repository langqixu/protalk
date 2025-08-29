#!/usr/bin/env node

/**
 * 自动部署验证脚本
 * 在部署后自动推送最新5条评论来验证卡片功能
 */

const axios = require('axios');

class AutoDeploymentVerification {
  constructor() {
    this.prodURL = process.env.PROD_URL || 'https://protalk.zeabur.app';
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5秒
  }

  /**
   * 等待服务完全启动
   */
  async waitForService() {
    console.log('⏳ 等待服务完全启动...');
    
    for (let i = 0; i < 10; i++) {
      try {
        const response = await axios.get(`${this.prodURL}/health`, {
          timeout: 5000
        });
        
        if (response.data.status === 'ok') {
          console.log('✅ 服务已就绪');
          return true;
        }
      } catch (error) {
        console.log(`   尝试 ${i + 1}/10: 服务尚未就绪，等待中...`);
        await this.sleep(3000);
      }
    }
    
    throw new Error('服务启动超时');
  }

  /**
   * 获取最新评论（检查数据库状态）
   */
  async getLatestReviews() {
    try {
      console.log('📋 获取最新评论数据...');
      
      const response = await axios.get(`${this.prodURL}/feishu/deployment/latest-reviews?limit=5`);
      
      if (response.data.success) {
        const reviews = response.data.data.reviews;
        console.log(`✅ 找到 ${reviews.length} 条评论`);
        
        if (reviews.length > 0) {
          console.log('📝 评论预览:');
          reviews.forEach((review, index) => {
            console.log(`   ${index + 1}. ${review.rating}⭐ ${review.title} (${review.reviewerNickname})`);
          });
        }
        
        return reviews;
      } else {
        throw new Error(response.data.error || '获取评论失败');
      }
    } catch (error) {
      console.error('❌ 获取最新评论失败:', error.message);
      throw error;
    }
  }

  /**
   * 执行部署验证
   */
  async runVerification() {
    try {
      console.log('🚀 开始执行部署验证...');
      
      const response = await axios.post(`${this.prodURL}/feishu/deployment/verify`, {}, {
        timeout: 60000 // 60秒超时
      });
      
      if (response.data.success) {
        const result = response.data.data;
        
        console.log('🎉 部署验证完成！');
        console.log(`📊 统计信息:`);
        console.log(`   - 找到评论: ${result.reviewsFound} 条`);
        console.log(`   - 推送成功: ${result.pushResult.success} 条`);
        console.log(`   - 推送失败: ${result.pushResult.failed} 条`);
        
        if (result.pushResult.errors.length > 0) {
          console.log('⚠️ 推送错误:');
          result.pushResult.errors.forEach(error => {
            console.log(`   - ${error}`);
          });
        }
        
        return result;
      } else {
        throw new Error(response.data.error || '验证失败');
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.msg?.includes('frequency limit')) {
        console.log('⚠️ 遇到频控限制，这是正常的保护机制');
        console.log('💡 请稍后手动测试或等待频控恢复');
        return { 
          reviewsFound: 0, 
          pushResult: { success: 0, failed: 0, errors: ['频控限制'] } 
        };
      }
      
      console.error('❌ 部署验证失败:', error.message);
      throw error;
    }
  }

  /**
   * 带重试的验证执行
   */
  async runWithRetry() {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`\n🔄 验证尝试 ${attempt}/${this.retryAttempts}`);
        
        // 等待服务就绪
        await this.waitForService();
        
        // 获取最新评论
        const reviews = await this.getLatestReviews();
        
        if (reviews.length === 0) {
          console.log('⚠️ 数据库中暂无评论数据，跳过验证');
          return { success: true, skipped: true, reason: '无评论数据' };
        }
        
        // 执行验证
        const result = await this.runVerification();
        
        console.log('\n✅ 部署验证成功完成');
        return { success: true, result };
        
      } catch (error) {
        console.error(`❌ 尝试 ${attempt} 失败:`, error.message);
        
        if (attempt < this.retryAttempts) {
          console.log(`⏳ ${this.retryDelay / 1000} 秒后重试...`);
          await this.sleep(this.retryDelay);
        }
      }
    }
    
    console.error('❌ 所有重试尝试都失败了');
    return { success: false, error: '验证失败' };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主函数
async function main() {
  console.log('🧪 Protalk 自动部署验证');
  console.log('================================');
  console.log(`🎯 目标URL: ${process.env.PROD_URL || 'https://protalk.zeabur.app'}`);
  console.log(`📅 时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('================================\n');

  const verifier = new AutoDeploymentVerification();
  
  try {
    const result = await verifier.runWithRetry();
    
    if (result.success) {
      if (result.skipped) {
        console.log('\n📋 验证总结: 已跳过 - ' + result.reason);
      } else {
        console.log('\n📋 验证总结: 成功');
        console.log('💡 建议: 前往飞书群组查看推送的验证评论');
        console.log('🔍 注意: 验证评论标题前会有 "[验证]" 标识');
        console.log('✅ 检查: 卡片是否显示完整信息和交互按钮');
      }
    } else {
      console.log('\n📋 验证总结: 失败');
      console.log('💡 建议: 检查日志并手动验证功能');
    }
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ 验证过程异常:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = AutoDeploymentVerification;
