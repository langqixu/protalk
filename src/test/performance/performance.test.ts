/**
 * 性能测试套件
 * 测试关键操作的性能表现，确保满足性能要求
 */

import { DataProcessor } from '../../modules/processor/DataProcessor';
import { AppReview } from '../../types';

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Performance Tests', () => {
  // 生成测试数据的工具函数
  const generateMockReviews = (count: number): AppReview[] => {
    const now = new Date();
    return Array.from({ length: count }, (_, index) => ({
      reviewId: `review-${index}`,
      appId: 'test-app',
      rating: Math.floor(Math.random() * 5) + 1,
      title: `Test Review ${index}`,
      body: `This is test review number ${index}`,
      reviewerNickname: `User${index}`,
      createdDate: new Date(now.getTime() - index * 60000), // 每个评论间隔1分钟
      isEdited: false,
      firstSyncAt: now,
      isPushed: false,
      createdAt: now,
      updatedAt: now
    }));
  };

  describe('DataProcessor Performance', () => {
    it('应该在30秒内处理1000个评论（性能要求）', async () => {
      const startTime = Date.now();
      const maxProcessingTime = 30000; // 30秒

      // 生成1000个评论
      const reviews = generateMockReviews(1000);
      const existingIds = new Set<string>();

      // 执行处理
      const result = DataProcessor.processReviewBatch(reviews, existingIds);

      const processingTime = Date.now() - startTime;

      // 验证性能要求
      expect(processingTime).toBeLessThan(maxProcessingTime);
      
      // 验证功能正确性
      expect(result.new).toHaveLength(1000);
      expect(result.updated).toHaveLength(0);

      console.log(`✅ 处理1000个评论耗时: ${processingTime}ms (要求: <${maxProcessingTime}ms)`);
    });

    it('应该高效处理重复数据去重', () => {
      const startTime = Date.now();
      
      // 创建有重复的评论数据
      const baseReviews = generateMockReviews(500);
      const duplicateReviews = [...baseReviews, ...baseReviews]; // 完全重复
      
      const result = DataProcessor.deduplicateReviews(duplicateReviews);
      
      const processingTime = Date.now() - startTime;
      
      // 验证去重正确性
      expect(result).toHaveLength(500);
      
      // 验证性能（应该在1秒内完成）
      expect(processingTime).toBeLessThan(1000);
      
      console.log(`✅ 去重1000个评论（500个重复）耗时: ${processingTime}ms`);
    });

    it('应该高效验证大量评论', () => {
      const startTime = Date.now();
      
      // 创建包含无效评论的数据
      const validReviews = generateMockReviews(800);
      const invalidReviews = Array.from({ length: 200 }, () => ({
        ...generateMockReviews(1)[0]!,
        reviewId: '', // 无效的ID
        rating: 6 // 无效的评分
      }));
      
      const allReviews = [...validReviews, ...invalidReviews];
      
      const result = DataProcessor.filterValidReviews(allReviews);
      
      const processingTime = Date.now() - startTime;
      
      // 验证过滤正确性
      expect(result).toHaveLength(800);
      
      // 验证性能（应该在2秒内完成）
      expect(processingTime).toBeLessThan(2000);
      
      console.log(`✅ 验证1000个评论耗时: ${processingTime}ms`);
    });

    it('应该高效排序大量评论', () => {
      const startTime = Date.now();
      
      // 创建随机顺序的评论
      const reviews = generateMockReviews(1000);
      // 打乱顺序
      for (let i = reviews.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [reviews[i], reviews[j]] = [reviews[j]!, reviews[i]!];
      }
      
      const result = DataProcessor.sortReviewsByDate(reviews);
      
      const processingTime = Date.now() - startTime;
      
      // 验证排序正确性（最新的在前）
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i]!.createdDate.getTime()).toBeGreaterThanOrEqual(
          result[i + 1]!.createdDate.getTime()
        );
      }
      
      // 验证性能（应该在1秒内完成）
      expect(processingTime).toBeLessThan(1000);
      
      console.log(`✅ 排序1000个评论耗时: ${processingTime}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('应该有效管理内存使用，避免内存泄漏', () => {
      // 记录初始内存使用
      const initialMemory = process.memoryUsage();
      
      // 执行多次大数据量处理
      for (let i = 0; i < 10; i++) {
        const reviews = generateMockReviews(1000);
        const existingIds = new Set<string>();
        
        DataProcessor.processReviewBatch(reviews, existingIds);
      }
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      console.log(`📊 内存使用增长: ${memoryIncreaseMB.toFixed(2)} MB`);
      
      // 内存增长应该控制在合理范围内（50MB以内）
      expect(memoryIncreaseMB).toBeLessThan(50);
    });
  });

  describe('Scalability Tests', () => {
    it('应该展示线性扩展性能', () => {
      const testSizes = [100, 500, 1000, 2000];
      const results: Array<{ size: number; time: number; rate: number }> = [];
      
      testSizes.forEach(size => {
        const startTime = Date.now();
        
        const reviews = generateMockReviews(size);
        const existingIds = new Set<string>();
        
        DataProcessor.processReviewBatch(reviews, existingIds);
        
        const processingTime = Date.now() - startTime;
        const rate = processingTime > 0 ? size / processingTime * 1000 : size * 1000; // 每秒处理数量
        
        results.push({ size, time: processingTime, rate });
        
        console.log(`📈 处理${size}个评论: ${processingTime}ms (${rate.toFixed(0)}条/秒)`);
      });
      
      // 验证扩展性：处理速率应该相对稳定
      const rates = results.map(r => r.rate).filter(rate => isFinite(rate));
      if (rates.length === 0) {
        console.log('📊 所有操作都非常快速，无法计算准确的变化幅度');
        return; // 如果所有速率都是无限大，跳过验证
      }
      
      const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
      const rateVariation = Math.max(...rates) - Math.min(...rates);
      const variationPercent = avgRate > 0 ? (rateVariation / avgRate) * 100 : 0;
      
      console.log(`📊 平均处理速率: ${avgRate.toFixed(0)}条/秒, 变化幅度: ${variationPercent.toFixed(1)}%`);
      
      // 变化幅度应该在合理范围内（50%以内）
      expect(variationPercent).toBeLessThan(50);
    });
  });

  describe('Concurrent Processing Tests', () => {
    it('应该支持并发处理多个批次', async () => {
      const startTime = Date.now();
      const batchCount = 5;
      const batchSize = 200;
      
      // 创建多个并发处理任务
      const promises = Array.from({ length: batchCount }, () => {
        return Promise.resolve().then(() => {
          const reviews = generateMockReviews(batchSize);
          const existingIds = new Set<string>();
          
          return DataProcessor.processReviewBatch(reviews, existingIds);
        });
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // 验证所有批次都正确处理
      results.forEach((result) => {
        expect(result.new).toHaveLength(batchSize);
        expect(result.updated).toHaveLength(0);
      });
      
      console.log(`🔄 并发处理${batchCount}个批次（共${batchCount * batchSize}条记录）耗时: ${totalTime}ms`);
      
      // 并发处理应该比串行处理更快
      const expectedSerialTime = batchCount * 1000; // 假设每批次1秒
      expect(totalTime).toBeLessThan(expectedSerialTime);
    });
  });

  describe('Edge Case Performance', () => {
    it('应该高效处理空数据集', () => {
      const startTime = Date.now();
      
      const emptyReviews: AppReview[] = [];
      const existingIds = new Set<string>();
      
      const result = DataProcessor.processReviewBatch(emptyReviews, existingIds);
      
      const processingTime = Date.now() - startTime;
      
      expect(result.new).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(processingTime).toBeLessThan(10); // 应该几乎立即完成
      
      console.log(`⚡ 处理空数据集耗时: ${processingTime}ms`);
    });

    it('应该高效处理全部已存在的数据', () => {
      const startTime = Date.now();
      
      const reviews = generateMockReviews(1000);
      const existingIds = new Set(reviews.map(r => r.reviewId));
      
      const result = DataProcessor.processReviewBatch(reviews, existingIds);
      
      const processingTime = Date.now() - startTime;
      
      expect(result.new).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(processingTime).toBeLessThan(5000); // 5秒内完成
      
      console.log(`🔍 处理1000个已存在评论耗时: ${processingTime}ms`);
    });
  });
});
