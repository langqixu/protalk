import { ReviewSyncService } from '../services/ReviewSyncService';
import { IReviewFetcher, IDatabaseManager, IPusher, AppReview } from '../types';
import { DataProcessor } from '../modules/processor/DataProcessor';

// Mock the DataProcessor
jest.mock('../modules/processor/DataProcessor');
const mockDataProcessor = DataProcessor as jest.Mocked<typeof DataProcessor>;

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('ReviewSyncService', () => {
  let reviewSyncService: ReviewSyncService;
  let mockFetcher: jest.Mocked<IReviewFetcher>;
  let mockDb: jest.Mocked<IDatabaseManager>;
  let mockPusher: jest.Mocked<IPusher>;

  const now = new Date();
  const mockAppReview: AppReview = {
    reviewId: 'test-review-1',
    appId: 'test-app-1',
    rating: 5,
    title: '很棒的应用',
    body: '这个应用非常好用',
    reviewerNickname: '测试用户',
    createdDate: new Date('2024-01-01'),
    isEdited: false,
    firstSyncAt: now,
    isPushed: false,
    createdAt: now,
    updatedAt: now
  };

  beforeEach(() => {
    // 创建mock对象
    mockFetcher = {
      syncReviews: jest.fn(),
      replyToReview: jest.fn()
    };

    mockDb = {
      upsertAppReviews: jest.fn(),
      getExistingReviewIds: jest.fn(),
      getAppReviewsByIds: jest.fn(),
      getLastSyncTime: jest.fn(),
      updateSyncTime: jest.fn(),
      updateReply: jest.fn(),
      hasReply: jest.fn()
    };

    mockPusher = {
      pushReviewUpdate: jest.fn(),
      pushBatchUpdates: jest.fn()
    };

    // 初始化服务
    reviewSyncService = new ReviewSyncService(mockFetcher, mockDb, mockPusher);

    // 重置所有mocks
    jest.clearAllMocks();
  });

  describe('syncReviews', () => {
    it('应该成功同步新评论', async () => {
      // Arrange
      const appId = 'test-app-1';
      const existingIds = new Set<string>();
      const apiReviews = [mockAppReview];
      const processedResult = {
        new: [mockAppReview],
        updated: []
      };

      mockDb.getExistingReviewIds.mockResolvedValue(existingIds);
      mockFetcher.syncReviews.mockResolvedValue(apiReviews);
      mockDataProcessor.processReviewBatch.mockReturnValue(processedResult);
      mockDb.upsertAppReviews.mockResolvedValue();
      mockPusher.pushBatchUpdates.mockResolvedValue();
      mockDb.updateSyncTime.mockResolvedValue();

      // Act
      const result = await reviewSyncService.syncReviews(appId);

      // Assert
      expect(result).toEqual({
        total: 1,
        new: 1,
        updated: 0,
        errors: []
      });

      expect(mockDb.getExistingReviewIds).toHaveBeenCalledWith(appId);
      expect(mockFetcher.syncReviews).toHaveBeenCalledWith(appId);
      expect(mockDataProcessor.processReviewBatch).toHaveBeenCalledWith(apiReviews, existingIds);
      expect(mockDb.upsertAppReviews).toHaveBeenCalledWith([mockAppReview]);
      expect(mockPusher.pushBatchUpdates).toHaveBeenCalledWith([mockAppReview], 'new');
      expect(mockDb.updateSyncTime).toHaveBeenCalledWith(appId);
    });

    it('应该处理没有新评论的情况', async () => {
      // Arrange
      const appId = 'test-app-1';
      const existingIds = new Set<string>();
      const apiReviews: AppReview[] = [];
      const processedResult = {
        new: [],
        updated: []
      };

      mockDb.getExistingReviewIds.mockResolvedValue(existingIds);
      mockFetcher.syncReviews.mockResolvedValue(apiReviews);
      mockDataProcessor.processReviewBatch.mockReturnValue(processedResult);
      mockDb.updateSyncTime.mockResolvedValue();

      // Act
      const result = await reviewSyncService.syncReviews(appId);

      // Assert
      expect(result).toEqual({
        total: 0,
        new: 0,
        updated: 0,
        errors: []
      });

      expect(mockDb.upsertAppReviews).not.toHaveBeenCalled();
      expect(mockPusher.pushBatchUpdates).not.toHaveBeenCalled();
      expect(mockDb.updateSyncTime).toHaveBeenCalledWith(appId);
    });

    it('应该处理有更新评论的情况', async () => {
      // Arrange
      const appId = 'test-app-1';
      const existingIds = new Set<string>();
      const updatedReview = { ...mockAppReview, reviewId: 'updated-review' };
      const apiReviews = [mockAppReview, updatedReview];
      const processedResult = {
        new: [mockAppReview],
        updated: [updatedReview]
      };

      mockDb.getExistingReviewIds.mockResolvedValue(existingIds);
      mockFetcher.syncReviews.mockResolvedValue(apiReviews);
      mockDataProcessor.processReviewBatch.mockReturnValue(processedResult);
      mockDb.upsertAppReviews.mockResolvedValue();
      mockPusher.pushBatchUpdates.mockResolvedValue();
      mockDb.updateSyncTime.mockResolvedValue();

      // Act
      const result = await reviewSyncService.syncReviews(appId);

      // Assert
      expect(result).toEqual({
        total: 2,
        new: 1,
        updated: 1,
        errors: []
      });

      expect(mockDb.upsertAppReviews).toHaveBeenCalledWith([mockAppReview, updatedReview]);
      expect(mockPusher.pushBatchUpdates).toHaveBeenCalledTimes(2);
      expect(mockPusher.pushBatchUpdates).toHaveBeenNthCalledWith(1, [mockAppReview], 'new');
      expect(mockPusher.pushBatchUpdates).toHaveBeenNthCalledWith(2, [updatedReview], 'update');
    });

    it('应该处理fetcher错误', async () => {
      // Arrange
      const appId = 'test-app-1';
      const existingIds = new Set<string>();
      const fetchError = new Error('获取评论失败');

      mockDb.getExistingReviewIds.mockResolvedValue(existingIds);
      mockFetcher.syncReviews.mockRejectedValue(fetchError);

      // Act & Assert
      await expect(reviewSyncService.syncReviews(appId)).rejects.toThrow('获取评论失败');
      expect(mockDb.upsertAppReviews).not.toHaveBeenCalled();
      expect(mockPusher.pushBatchUpdates).not.toHaveBeenCalled();
      expect(mockDb.updateSyncTime).not.toHaveBeenCalled();
    });

    it('应该处理数据库错误', async () => {
      // Arrange
      const appId = 'test-app-1';
      const existingIds = new Set<string>();
      const apiReviews = [mockAppReview];
      const processedResult = {
        new: [mockAppReview],
        updated: []
      };
      const dbError = new Error('数据库更新失败');

      mockDb.getExistingReviewIds.mockResolvedValue(existingIds);
      mockFetcher.syncReviews.mockResolvedValue(apiReviews);
      mockDataProcessor.processReviewBatch.mockReturnValue(processedResult);
      mockDb.upsertAppReviews.mockRejectedValue(dbError);

      // Act & Assert
      await expect(reviewSyncService.syncReviews(appId)).rejects.toThrow('数据库更新失败');
      expect(mockPusher.pushBatchUpdates).not.toHaveBeenCalled();
      expect(mockDb.updateSyncTime).not.toHaveBeenCalled();
    });

    it('应该处理推送错误', async () => {
      // Arrange
      const appId = 'test-app-1';
      const existingIds = new Set<string>();
      const apiReviews = [mockAppReview];
      const processedResult = {
        new: [mockAppReview],
        updated: []
      };
      const pushError = new Error('推送失败');

      mockDb.getExistingReviewIds.mockResolvedValue(existingIds);
      mockFetcher.syncReviews.mockResolvedValue(apiReviews);
      mockDataProcessor.processReviewBatch.mockReturnValue(processedResult);
      mockDb.upsertAppReviews.mockResolvedValue();
      mockPusher.pushBatchUpdates.mockRejectedValue(pushError);

      // Act & Assert
      await expect(reviewSyncService.syncReviews(appId)).rejects.toThrow('推送失败');
      expect(mockDb.updateSyncTime).not.toHaveBeenCalled();
    });
  });

  describe('syncAllApps', () => {
    it('应该成功同步多个应用', async () => {
      // Arrange
      const appIds = ['app1', 'app2'];
      const syncResult = {
        total: 1,
        new: 1,
        updated: 0,
        errors: []
      };

      // Mock syncReviews to return success for both apps
      jest.spyOn(reviewSyncService, 'syncReviews').mockResolvedValue(syncResult);

      // Act
      const result = await reviewSyncService.syncAllApps(appIds);

      // Assert
      expect(result).toEqual({
        totalApps: 2,
        successApps: 2,
        failedApps: [],
        totalReviews: 2,
        totalNew: 2,
        totalUpdated: 0
      });

      expect(reviewSyncService.syncReviews).toHaveBeenCalledTimes(2);
      expect(reviewSyncService.syncReviews).toHaveBeenNthCalledWith(1, 'app1');
      expect(reviewSyncService.syncReviews).toHaveBeenNthCalledWith(2, 'app2');
    });

    it('应该处理部分应用同步失败的情况', async () => {
      // Arrange
      const appIds = ['app1', 'app2', 'app3'];
      const successResult = {
        total: 1,
        new: 1,
        updated: 0,
        errors: []
      };

      const syncReviewsSpy = jest.spyOn(reviewSyncService, 'syncReviews');
      syncReviewsSpy.mockResolvedValueOnce(successResult); // app1 success
      syncReviewsSpy.mockRejectedValueOnce(new Error('app2 failed')); // app2 failed
      syncReviewsSpy.mockResolvedValueOnce(successResult); // app3 success

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

    it('应该处理空应用列表', async () => {
      // Arrange
      const appIds: string[] = [];
      const syncReviewsSpy = jest.spyOn(reviewSyncService, 'syncReviews');

      // Act
      const result = await reviewSyncService.syncAllApps(appIds);

      // Assert
      expect(result).toEqual({
        totalApps: 0,
        successApps: 0,
        failedApps: [],
        totalReviews: 0,
        totalNew: 0,
        totalUpdated: 0
      });

      expect(syncReviewsSpy).not.toHaveBeenCalled();
    });
  });
});
