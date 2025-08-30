/**
 * 监控测试套件
 * 测试系统的监控指标、健康检查和告警机制
 */

import { ReviewSyncService } from '../../services/ReviewSyncService';
import { SupabaseManager } from '../../modules/storage/SupabaseManager';
import { AppReview, IReviewFetcher, IPusher } from '../../types';

// Mock dependencies
jest.mock('../../modules/storage/SupabaseManager');
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const MockedSupabaseManager = SupabaseManager as jest.MockedClass<typeof SupabaseManager>;

describe('Monitoring Tests', () => {
  let reviewSyncService: ReviewSyncService;
  let mockSupabaseManager: jest.Mocked<SupabaseManager>;
  let mockFetcher: jest.Mocked<IReviewFetcher>;
  let mockPusher: jest.Mocked<IPusher>;

  beforeEach(() => {
    // 创建mock实例
    mockSupabaseManager = {
      upsertAppReviews: jest.fn(),
      getExistingReviewIds: jest.fn(),
      getAppReviewsByIds: jest.fn(),
      getLastSyncTime: jest.fn(),
      updateSyncTime: jest.fn(),
      updateReply: jest.fn(),
      hasReply: jest.fn()
    } as any;

    mockFetcher = {
      syncReviews: jest.fn(),
      replyToReview: jest.fn()
    };

    mockPusher = {
      pushReviewUpdate: jest.fn(),
      pushBatchUpdates: jest.fn()
    };

    MockedSupabaseManager.mockImplementation(() => mockSupabaseManager);
    reviewSyncService = new ReviewSyncService(mockFetcher, mockSupabaseManager, mockPusher);

    jest.clearAllMocks();
  });

  describe('健康检查监控', () => {
    it('应该检测到系统健康状态', async () => {
      // Arrange
      const appId = 'health-check-app';
      const healthyResponse: AppReview[] = [{
        reviewId: 'health-check-1',
        appId,
        rating: 5,
        title: 'Health Check',
        body: 'System is healthy',
        reviewerNickname: 'HealthChecker',
        createdDate: new Date(),
        isEdited: false,
        firstSyncAt: new Date(),
        isPushed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockFetcher.syncReviews.mockResolvedValue(healthyResponse);
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      mockSupabaseManager.updateSyncTime.mockResolvedValue();
      mockPusher.pushBatchUpdates.mockResolvedValue();

      // Act
      const startTime = Date.now();
      const result = await reviewSyncService.syncReviews(appId);
      const responseTime = Date.now() - startTime;

      // Assert - 健康检查指标
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);
      expect(responseTime).toBeLessThan(5000); // 响应时间 < 5秒

      // 验证所有组件都正常响应
      expect(mockFetcher.syncReviews).toHaveBeenCalled();
      expect(mockSupabaseManager.getExistingReviewIds).toHaveBeenCalled();
      expect(mockSupabaseManager.updateSyncTime).toHaveBeenCalled();

      console.log(`✅ 健康检查通过 - 响应时间: ${responseTime}ms`);
    });

    it('应该检测到数据库连接问题', async () => {
      // Arrange
      const appId = 'db-failure-test';
      const dbError = new Error('数据库连接失败');
      
      mockSupabaseManager.getExistingReviewIds.mockRejectedValue(dbError);

      // Act & Assert
      await expect(reviewSyncService.syncReviews(appId)).rejects.toThrow('数据库连接失败');
      
      console.log('🔍 数据库故障检测正常');
    });

    it('应该检测到外部API问题', async () => {
      // Arrange
      const appId = 'api-failure-test';
      const apiError = new Error('API服务不可用');
      
      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockFetcher.syncReviews.mockRejectedValue(apiError);

      // Act & Assert
      await expect(reviewSyncService.syncReviews(appId)).rejects.toThrow('API服务不可用');
      
      console.log('🔍 外部API故障检测正常');
    });

    it('应该检测到推送服务问题', async () => {
      // Arrange
      const appId = 'push-failure-test';
      const pushError = new Error('推送服务失败');
      const mockReviews: AppReview[] = [{
        reviewId: 'test-review',
        appId,
        rating: 5,
        title: 'Test',
        body: 'Test review',
        reviewerNickname: 'Tester',
        createdDate: new Date(),
        isEdited: false,
        firstSyncAt: new Date(),
        isPushed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockFetcher.syncReviews.mockResolvedValue(mockReviews);
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      mockPusher.pushBatchUpdates.mockRejectedValue(pushError);

      // Act & Assert
      await expect(reviewSyncService.syncReviews(appId)).rejects.toThrow('推送服务失败');
      
      console.log('🔍 推送服务故障检测正常');
    });
  });

  describe('性能监控', () => {
    it('应该监控同步操作的响应时间', async () => {
      // Arrange
      const appId = 'performance-test';
      const mockReviews = Array.from({ length: 100 }, (_, i) => ({
        reviewId: `perf-review-${i}`,
        appId,
        rating: 5,
        title: `Performance Test ${i}`,
        body: `Test review ${i}`,
        reviewerNickname: `User${i}`,
        createdDate: new Date(),
        isEdited: false,
        firstSyncAt: new Date(),
        isPushed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockFetcher.syncReviews.mockResolvedValue(mockReviews);
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      mockSupabaseManager.updateSyncTime.mockResolvedValue();
      mockPusher.pushBatchUpdates.mockResolvedValue();

      // Act
      const startTime = Date.now();
      const result = await reviewSyncService.syncReviews(appId);
      const responseTime = Date.now() - startTime;

      // Assert - 性能指标
      expect(responseTime).toBeLessThan(5000); // < 5秒要求
      expect(result.total).toBe(100);
      expect(result.new).toBe(100);

      // 计算吞吐量
      const throughput = result.total / (responseTime / 1000); // 条/秒
      expect(throughput).toBeGreaterThan(10); // 至少10条/秒

      console.log(`📊 性能监控 - 响应时间: ${responseTime}ms, 吞吐量: ${throughput.toFixed(1)}条/秒`);
    });

    it('应该监控批量操作的效率', async () => {
      // Arrange
      const appIds = ['app1', 'app2', 'app3', 'app4', 'app5'];
      const mockReviews = Array.from({ length: 10 }, (_, i) => ({
        reviewId: `batch-review-${i}`,
        appId: 'test-app',
        rating: 5,
        title: `Batch Test ${i}`,
        body: `Test review ${i}`,
        reviewerNickname: `User${i}`,
        createdDate: new Date(),
        isEdited: false,
        firstSyncAt: new Date(),
        isPushed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Mock每个应用返回相同的数据
      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockFetcher.syncReviews.mockResolvedValue(mockReviews);
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      mockSupabaseManager.updateSyncTime.mockResolvedValue();
      mockPusher.pushBatchUpdates.mockResolvedValue();

      // Act
      const startTime = Date.now();
      const result = await reviewSyncService.syncAllApps(appIds);
      const totalTime = Date.now() - startTime;

      // Assert
      expect(result.totalApps).toBe(5);
      expect(result.successApps).toBe(5);
      expect(result.failedApps).toHaveLength(0);
      expect(totalTime).toBeLessThan(10000); // 批量操作 < 10秒

      const avgTimePerApp = totalTime / result.totalApps;
      console.log(`📊 批量操作监控 - 总时间: ${totalTime}ms, 平均每应用: ${avgTimePerApp.toFixed(1)}ms`);
    });
  });

  describe('错误率监控', () => {
    it('应该监控和报告错误率', async () => {
      // Arrange
      const appIds = ['app1', 'app2', 'app3', 'app4', 'app5'];
      let callCount = 0;

      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockFetcher.syncReviews.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // 前两次成功
          return Promise.resolve([]);
        } else {
          // 后面失败
          return Promise.reject(new Error('模拟API失败'));
        }
      });

      // Act
      const result = await reviewSyncService.syncAllApps(appIds);

      // Assert
      const errorRate = result.failedApps.length / result.totalApps;
      expect(result.successApps).toBe(2);
      expect(result.failedApps).toHaveLength(3);
      expect(errorRate).toBe(0.6); // 60%错误率

      console.log(`📊 错误率监控 - 成功: ${result.successApps}, 失败: ${result.failedApps.length}, 错误率: ${(errorRate * 100).toFixed(1)}%`);

      // 错误率过高应该触发告警
      if (errorRate > 0.5) {
        console.warn('🚨 错误率过高告警: 超过50%的操作失败');
      }
    });
  });

  describe('资源使用监控', () => {
    it('应该监控内存使用情况', async () => {
      // 记录初始内存
      const initialMemory = process.memoryUsage();
      
      // 执行多次操作
      const appId = 'memory-test';
      const operations = 10;
      
      for (let i = 0; i < operations; i++) {
        mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
        mockFetcher.syncReviews.mockResolvedValue([]);
        mockSupabaseManager.updateSyncTime.mockResolvedValue();
        
        await reviewSyncService.syncReviews(appId);
      }

      // 检查内存使用
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`📊 内存监控 - 增长: ${memoryIncreaseMB.toFixed(2)}MB (${operations}次操作)`);

      // 内存增长应该在合理范围内
      expect(memoryIncreaseMB).toBeLessThan(10); // 小于10MB
    });

    it('应该监控并发处理能力', async () => {
      // Arrange
      const concurrentOperations = 5;
      const appId = 'concurrent-test';

      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockFetcher.syncReviews.mockResolvedValue([]);
      mockSupabaseManager.updateSyncTime.mockResolvedValue();

      // Act - 并发执行
      const startTime = Date.now();
      const promises = Array.from({ length: concurrentOperations }, () => 
        reviewSyncService.syncReviews(appId)
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(concurrentOperations);
      results.forEach(result => {
        expect(result.errors).toHaveLength(0);
      });

      console.log(`📊 并发监控 - ${concurrentOperations}个并发操作耗时: ${totalTime}ms`);

      // 并发处理应该比串行更高效
      const avgTimePerOperation = totalTime / concurrentOperations;
      expect(avgTimePerOperation).toBeLessThan(1000); // 平均每个操作 < 1秒
    });
  });

  describe('告警机制测试', () => {
    it('应该在连续失败时触发告警', async () => {
      // Arrange
      const appId = 'alert-test';
      const consecutiveFailures = 3;
      const alertThreshold = 3;

      mockSupabaseManager.getExistingReviewIds.mockRejectedValue(new Error('持续数据库错误'));

      // Act - 连续失败
      let failureCount = 0;
      for (let i = 0; i < consecutiveFailures; i++) {
        try {
          await reviewSyncService.syncReviews(appId);
        } catch (error) {
          failureCount++;
        }
      }

      // Assert
      expect(failureCount).toBe(consecutiveFailures);

      // 模拟告警逻辑
      if (failureCount >= alertThreshold) {
        console.warn(`🚨 连续失败告警: ${failureCount}次连续失败，超过阈值${alertThreshold}`);
      }

      expect(failureCount).toBeGreaterThanOrEqual(alertThreshold);
    });

    it('应该在响应时间过长时触发告警', async () => {
      // Arrange
      const appId = 'slow-response-test';
      const responseTimeThreshold = 2000; // 2秒

      // 模拟慢响应
      mockSupabaseManager.getExistingReviewIds.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(new Set()), 3000))
      );
      mockFetcher.syncReviews.mockResolvedValue([]);
      mockSupabaseManager.updateSyncTime.mockResolvedValue();

      // Act
      const startTime = Date.now();
      await reviewSyncService.syncReviews(appId);
      const responseTime = Date.now() - startTime;

      // Assert
      expect(responseTime).toBeGreaterThan(responseTimeThreshold);

      // 模拟响应时间告警
      if (responseTime > responseTimeThreshold) {
        console.warn(`🚨 响应时间告警: ${responseTime}ms，超过阈值${responseTimeThreshold}ms`);
      }
    });
  });

  describe('业务指标监控', () => {
    it('应该监控评论处理效率', async () => {
      // Arrange
      const appId = 'efficiency-test';
      const mockReviews = Array.from({ length: 50 }, (_, i) => ({
        reviewId: `efficiency-review-${i}`,
        appId,
        rating: Math.floor(Math.random() * 5) + 1,
        title: `Efficiency Test ${i}`,
        body: `Test review ${i}`,
        reviewerNickname: `User${i}`,
        createdDate: new Date(),
        isEdited: false,
        firstSyncAt: new Date(),
        isPushed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockFetcher.syncReviews.mockResolvedValue(mockReviews);
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      mockSupabaseManager.updateSyncTime.mockResolvedValue();
      mockPusher.pushBatchUpdates.mockResolvedValue();

      // Act
      const startTime = Date.now();
      const result = await reviewSyncService.syncReviews(appId);
      const processingTime = Date.now() - startTime;

      // Assert - 业务指标
      const processingRate = result.total / (processingTime / 1000); // 条/秒
      const newReviewRate = result.new / result.total; // 新评论比率

      expect(processingRate).toBeGreaterThan(5); // 至少5条/秒
      expect(newReviewRate).toBe(1); // 100%新评论

      console.log(`📊 业务指标 - 处理速率: ${processingRate.toFixed(1)}条/秒, 新评论率: ${(newReviewRate * 100).toFixed(1)}%`);
    });

    it('应该监控重复数据处理效率', async () => {
      // Arrange
      const appId = 'duplicate-test';
      const mockReviews = Array.from({ length: 30 }, (_, i) => ({
        reviewId: `duplicate-review-${i}`,
        appId,
        rating: 5,
        title: `Duplicate Test ${i}`,
        body: `Test review ${i}`,
        reviewerNickname: `User${i}`,
        createdDate: new Date(),
        isEdited: false,
        firstSyncAt: new Date(),
        isPushed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // 模拟一半已存在
      const existingIds = new Set(mockReviews.slice(0, 15).map(r => r.reviewId));
      
      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(existingIds);
      mockFetcher.syncReviews.mockResolvedValue(mockReviews);
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      mockSupabaseManager.updateSyncTime.mockResolvedValue();
      mockPusher.pushBatchUpdates.mockResolvedValue();

      // Act
      const result = await reviewSyncService.syncReviews(appId);

      // Assert - 重复数据处理效率
      const duplicateRate = (result.total - result.new) / result.total;
      const newDataEfficiency = result.new / result.total;

      expect(result.total).toBe(30);
      expect(result.new).toBe(15); // 只有一半是新的
      expect(duplicateRate).toBe(0.5); // 50%重复率
      expect(newDataEfficiency).toBe(0.5); // 50%新数据效率

      console.log(`📊 重复数据监控 - 重复率: ${(duplicateRate * 100).toFixed(1)}%, 新数据效率: ${(newDataEfficiency * 100).toFixed(1)}%`);
    });
  });
});
