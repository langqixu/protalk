#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// 从环境变量或配置加载 Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://mmvdqxnqrxkjjdvzgqgx.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ 缺少 SUPABASE_ANON_KEY 或 SUPABASE_SERVICE_ROLE_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPushedStatus() {
  try {
    console.log('🔍 检查数据库中评论的推送状态...\n');
    
    // 统计总体状态
    const { data: stats, error: statsError } = await supabase
      .from('app_reviews')
      .select('is_pushed, push_type', { count: 'exact' });
    
    if (statsError) {
      console.error('❌ 查询统计失败:', statsError);
      return;
    }
    
    const totalCount = stats.length;
    const pushedCount = stats.filter(r => r.is_pushed === true).length;
    const unpushedCount = stats.filter(r => r.is_pushed === false || r.is_pushed === null).length;
    
    console.log('📊 总体统计:');
    console.log(`   总评论数: ${totalCount}`);
    console.log(`   已推送: ${pushedCount}`);
    console.log(`   未推送: ${unpushedCount}`);
    console.log('');
    
    // 检查最近的未推送评论
    const { data: recentUnpushed, error: recentError } = await supabase
      .from('app_reviews')
      .select('review_id, created_date, is_pushed, push_type, title')
      .or('is_pushed.is.null,is_pushed.eq.false')
      .order('created_date', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.error('❌ 查询最近未推送评论失败:', recentError);
      return;
    }
    
    console.log('🔍 最近 10 条未推送评论:');
    if (recentUnpushed.length === 0) {
      console.log('   ✅ 没有未推送的评论');
    } else {
      recentUnpushed.forEach((review, index) => {
        console.log(`   ${index + 1}. ${review.review_id.slice(0, 20)}... (${review.created_date}) - "${review.title?.slice(0, 30)}..."`);
      });
    }
    console.log('');
    
    // 检查最近推送的评论
    const { data: recentPushed, error: pushedError } = await supabase
      .from('app_reviews')
      .select('review_id, created_date, is_pushed, push_type, title')
      .eq('is_pushed', true)
      .order('created_date', { ascending: false })
      .limit(5);
    
    if (pushedError) {
      console.error('❌ 查询最近已推送评论失败:', pushedError);
      return;
    }
    
    console.log('✅ 最近 5 条已推送评论:');
    if (recentPushed.length === 0) {
      console.log('   ❌ 没有已推送的评论');
    } else {
      recentPushed.forEach((review, index) => {
        console.log(`   ${index + 1}. ${review.review_id.slice(0, 20)}... (${review.push_type}) - "${review.title?.slice(0, 30)}..."`);
      });
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkPushedStatus().then(() => {
  console.log('\n🎉 数据库推送状态检查完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
