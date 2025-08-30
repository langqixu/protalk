/**
 * 集成测试：评论同步完整流程
 * 测试从API获取评论 -> 数据处理 -> 数据库存储 -> 飞书推送的完整链路
 */

import { ReviewSyncService } from '../../services/ReviewSyncService';
import { SupabaseManager } from '../../modules/storage/SupabaseManager';
import { AppReview, IReviewFetcher, IPusher } from '../../types';

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock SupabaseManager
jest.mock('../../modules/storage/SupabaseManager');

const MockedSupabaseManager = SupabaseManager as jest.MockedClass<typeof SupabaseManager>;

describe('Review Sync Integration Tests', () => {
  let reviewSyncService: ReviewSyncService;
  let mockFetcher: jest.Mocked<IReviewFetcher>;
  let mockPusher: jest.Mocked<IPusher>;
  let mockSupabaseManager: jest.Mocked<SupabaseManager>;

  const now = new Date();
  const mockAppReviews: AppReview[] = [
    {
      reviewId: 'integration-test-1',
      appId: 'test-app-integration',
      rating: 5,
      title: '集成测试评论1',
      body: '这是一个集成测试评论',
      reviewerNickname: '集成测试用户1',
      createdDate: new Date('2024-01-01'),
      isEdited: false,
      firstSyncAt: now,
      isPushed: false,
      createdAt: now,
      updatedAt: now
    },
    {
      reviewId: 'integration-test-2',
      appId: 'test-app-integration',
      rating: 4,
      title: '集成测试评论2',
      body: '这是另一个集成测试评论',
      reviewerNickname: '集成测试用户2',
      createdDate: new Date('2024-01-02'),
      isEdited: false,
      firstSyncAt: now,
      isPushed: false,
      createdAt: now,
      updatedAt: now
    }
  ];

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

    // 设置mock返回值
    MockedSupabaseManager.mockImplementation(() => mockSupabaseManager);

    // 创建ReviewSyncService
    reviewSyncService = new ReviewSyncService(mockFetcher, mockSupabaseManager, mockPusher);

    // 重置所有mocks
    jest.clearAllMocks();
  });

  describe('完整评论同步流程', () => {
    it('应该正确处理从API获取到推送的完整流程', async () => {
      // Arrange
      const appId = 'test-app-integration';
      
      // Mock fetcher返回评论数据
      mockFetcher.syncReviews.mockResolvedValue(mockAppReviews);
      
      // Mock 数据库返回空的已存在ID集合（模拟全新评论）
      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      mockSupabaseManager.updateSyncTime.mockResolvedValue();
      
      // Mock 推送成功
      mockPusher.pushBatchUpdates.mockResolvedValue();

      // Act
      const result = await reviewSyncService.syncReviews(appId);

      // Assert
      expect(result).toEqual({
        total: 2,
        new: 2,
        updated: 0,
        errors: []
      });

      // 验证调用链
      expect(mockFetcher.syncReviews).toHaveBeenCalledWith(appId);
      expect(mockSupabaseManager.getExistingReviewIds).toHaveBeenCalledWith(appId);
      expect(mockSupabaseManager.upsertAppReviews).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ reviewId: 'integration-test-1' }),
          expect.objectContaining({ reviewId: 'integration-test-2' })
        ])
      );
      expect(mockPusher.pushBatchUpdates).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ reviewId: 'integration-test-1' }),
          expect.objectContaining({ reviewId: 'integration-test-2' })
        ]),
        'new'
      );
      expect(mockSupabaseManager.updateSyncTime).toHaveBeenCalledWith(appId);
    });

    it('应该正确处理部分评论已存在的情况', async () => {
      // Arrange
      const appId = 'test-app-integration';
      
      mockFetcher.syncReviews.mockResolvedValue(mockAppReviews);
      
      // Mock 数据库返回一个已存在的ID
      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set(['integration-test-1']));
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      mockSupabaseManager.updateSyncTime.mockResolvedValue();
      
      mockPusher.pushBatchUpdates.mockResolvedValue();

      // Act
      const result = await reviewSyncService.syncReviews(appId);

      // Assert
      expect(result).toEqual({
        total: 2,
        new: 1, // 只有一个新评论（integration-test-2）
        updated: 0,
        errors: []
      });

      // 验证只推送了新评论
      expect(mockPusher.pushBatchUpdates).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ reviewId: 'integration-test-2' })
        ]),
        'new'
      );
    });

    it('应该正确处理fetcher失败的情况', async () => {
      // Arrange
      const appId = 'test-app-integration';
      const fetchError = new Error('API请求失败');
      
      mockFetcher.syncReviews.mockRejectedValue(fetchError);
      
      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());

      // Act & Assert
      await expect(reviewSyncService.syncReviews(appId)).rejects.toThrow('API请求失败');
      
      // 验证没有进行数据库操作和推送
      expect(mockSupabaseManager.upsertAppReviews).not.toHaveBeenCalled();
      expect(mockPusher.pushBatchUpdates).not.toHaveBeenCalled();
    });

    it('应该正确处理数据库失败的情况', async () => {
      // Arrange
      const appId = 'test-app-integration';
      const dbError = { message: '数据库连接失败', code: 'PGRST001' };
      
      mockFetcher.syncReviews.mockResolvedValue(mockAppReviews);
      
      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockSupabaseManager.upsertAppReviews.mockRejectedValue(dbError);

      // Act & Assert
      await expect(reviewSyncService.syncReviews(appId)).rejects.toEqual(dbError);
      
      // 验证没有进行推送
      expect(mockPusher.pushBatchUpdates).not.toHaveBeenCalled();
    });

    it('应该正确处理推送失败的情况', async () => {
      // Arrange
      const appId = 'test-app-integration';
      const pushError = new Error('飞书推送失败');
      
      mockFetcher.syncReviews.mockResolvedValue(mockAppReviews);
      
      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      
      mockPusher.pushBatchUpdates.mockRejectedValue(pushError);

      // Act & Assert
      await expect(reviewSyncService.syncReviews(appId)).rejects.toThrow('飞书推送失败');
      
      // 验证数据库操作已完成，但推送失败
      expect(mockSupabaseManager.upsertAppReviews).toHaveBeenCalled();
    });
  });

  describe('数据处理集成', () => {
    it('应该正确集成DataProcessor的数据处理逻辑', async () => {
      // Arrange
      const appId = 'test-app-integration';
      const reviewsWithDuplicates: AppReview[] = [
        ...mockAppReviews,
        { ...mockAppReviews[0]!, reviewId: 'integration-test-1' }, // 重复
        { ...mockAppReviews[0]!, reviewId: 'invalid-review', rating: 6 } // 无效
      ];
      
      mockFetcher.syncReviews.mockResolvedValue(reviewsWithDuplicates);
      
      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      mockSupabaseManager.updateSyncTime.mockResolvedValue();
      
      mockPusher.pushBatchUpdates.mockResolvedValue();

      // Act
      const result = await reviewSyncService.syncReviews(appId);

      // Assert
      expect(result).toEqual({
        total: 4,
        new: 2, // 经过去重和过滤后只有2个有效评论
        updated: 0,
        errors: []
      });

      // 验证数据库只接收了有效的、去重后的评论
      expect(mockSupabaseManager.upsertAppReviews).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ reviewId: 'integration-test-1' }),
          expect.objectContaining({ reviewId: 'integration-test-2' })
        ])
      );
      
      // 验证upsert的数据数量正确（无重复，无无效）
      const upsertCall = mockSupabaseManager.upsertAppReviews.mock.calls[0];
      expect(upsertCall?.[0]).toHaveLength(2);
    });
  });

  describe('多应用同步集成', () => {
    it('应该正确处理多个应用的并行同步', async () => {
      // Arrange
      const appIds = ['app1', 'app2', 'app3'];
      
      // 为每个应用准备不同的mock数据
      mockFetcher.syncReviews
        .mockResolvedValueOnce([mockAppReviews[0]!]) // app1: 1个评论
        .mockResolvedValueOnce([mockAppReviews[1]!]) // app2: 1个评论
        .mockResolvedValueOnce([]); // app3: 0个评论
      
      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      mockSupabaseManager.updateSyncTime.mockResolvedValue();
      
      mockPusher.pushBatchUpdates.mockResolvedValue();

      // Act
      const result = await reviewSyncService.syncAllApps(appIds);

      // Assert
      expect(result).toEqual({
        totalApps: 3,
        successApps: 3,
        failedApps: [],
        totalReviews: 2,
        totalNew: 2,
        totalUpdated: 0
      });

      // 验证每个应用都被调用了
      expect(mockFetcher.syncReviews).toHaveBeenCalledTimes(3);
      expect(mockFetcher.syncReviews).toHaveBeenNthCalledWith(1, 'app1');
      expect(mockFetcher.syncReviews).toHaveBeenNthCalledWith(2, 'app2');
      expect(mockFetcher.syncReviews).toHaveBeenNthCalledWith(3, 'app3');
    });

    it('应该正确处理部分应用同步失败的情况', async () => {
      // Arrange
      const appIds = ['app1', 'app2', 'app3'];
      
      mockFetcher.syncReviews
        .mockResolvedValueOnce([mockAppReviews[0]!]) // app1: 成功
        .mockRejectedValueOnce(new Error('app2失败')) // app2: 失败
        .mockResolvedValueOnce([mockAppReviews[1]!]); // app3: 成功
      
      mockSupabaseManager.getExistingReviewIds.mockResolvedValue(new Set());
      mockSupabaseManager.upsertAppReviews.mockResolvedValue();
      mockSupabaseManager.updateSyncTime.mockResolvedValue();
      
      mockPusher.pushBatchUpdates.mockResolvedValue();

      // Act
      const result = await reviewSyncService.syncAllApps(appIds);

      // Assert
      expect(result).toEqual({
        totalApps: 3,
        successApps: 2,
        failedApps: ['app2'],
        totalReviews: 2,
        totalNew: 2,
        totalUpdated: 0
      });
    });
  });
});
