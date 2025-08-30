import { SupabaseManager } from '../modules/storage/SupabaseManager';
import { AppReview } from '../types';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('SupabaseManager', () => {
  let supabaseManager: SupabaseManager;
  let mockClient: any;

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
    // 创建mock Supabase client
    mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis()
    };

    mockCreateClient.mockReturnValue(mockClient);

    // 创建SupabaseManager实例
    supabaseManager = new SupabaseManager({
      supabase: {
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key'
      }
    });

    // 重置所有mocks
    jest.clearAllMocks();
  });

  describe('upsertAppReviews', () => {
    it('应该成功批量更新评论', async () => {
      // Arrange
      const reviews = [mockAppReview];
      mockClient.from.mockReturnValue(mockClient);
      mockClient.upsert.mockResolvedValue({ error: null });

      // Act
      await supabaseManager.upsertAppReviews(reviews);

      // Assert
      expect(mockClient.from).toHaveBeenCalledWith('app_reviews');
      expect(mockClient.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            review_id: 'test-review-1',
            app_id: 'test-app-1',
            rating: 5,
            title: '很棒的应用',
            body: '这个应用非常好用',
            reviewer_nickname: '测试用户',
            is_edited: false,
            is_pushed: false
          })
        ]),
        {
          onConflict: 'review_id',
          ignoreDuplicates: false
        }
      );
    });

    it('应该处理空评论数组', async () => {
      // Arrange
      const reviews: AppReview[] = [];

      // Act
      await supabaseManager.upsertAppReviews(reviews);

      // Assert
      expect(mockClient.from).not.toHaveBeenCalled();
      expect(mockClient.upsert).not.toHaveBeenCalled();
    });

    it('应该处理数据库错误', async () => {
      // Arrange
      const reviews = [mockAppReview];
      const dbError = { message: '数据库连接失败', code: 'PGRST001' };
      mockClient.from.mockReturnValue(mockClient);
      mockClient.upsert.mockResolvedValue({ error: dbError });

      // Act & Assert
      await expect(supabaseManager.upsertAppReviews(reviews)).rejects.toEqual(dbError);
    });
  });

  describe('getExistingReviewIds', () => {
    it('应该返回已存在的评论ID集合', async () => {
      // Arrange
      const appId = 'test-app-1';
      const mockData = [
        { review_id: 'review1' },
        { review_id: 'review2' },
        { review_id: 'review3' }
      ];
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.select.mockReturnValue(mockClient);
      mockClient.eq.mockResolvedValue({ data: mockData, error: null });

      // Act
      const result = await supabaseManager.getExistingReviewIds(appId);

      // Assert
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(3);
      expect(result.has('review1')).toBe(true);
      expect(result.has('review2')).toBe(true);
      expect(result.has('review3')).toBe(true);
      
      expect(mockClient.from).toHaveBeenCalledWith('app_reviews');
      expect(mockClient.select).toHaveBeenCalledWith('review_id');
      expect(mockClient.eq).toHaveBeenCalledWith('app_id', appId);
    });

    it('应该处理空结果', async () => {
      // Arrange
      const appId = 'test-app-1';
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.select.mockReturnValue(mockClient);
      mockClient.eq.mockResolvedValue({ data: [], error: null });

      // Act
      const result = await supabaseManager.getExistingReviewIds(appId);

      // Assert
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('应该处理null数据', async () => {
      // Arrange
      const appId = 'test-app-1';
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.select.mockReturnValue(mockClient);
      mockClient.eq.mockResolvedValue({ data: null, error: null });

      // Act
      const result = await supabaseManager.getExistingReviewIds(appId);

      // Assert
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('应该处理数据库错误', async () => {
      // Arrange
      const appId = 'test-app-1';
      const dbError = { message: '查询失败', code: 'PGRST002' };
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.select.mockReturnValue(mockClient);
      mockClient.eq.mockResolvedValue({ data: null, error: dbError });

      // Act & Assert
      await expect(supabaseManager.getExistingReviewIds(appId)).rejects.toEqual(dbError);
    });
  });

  describe('getAppReviewsByIds', () => {
    it('应该返回指定ID的评论映射', async () => {
      // Arrange
      const reviewIds = ['review1', 'review2'];
      const mockData = [
        {
          review_id: 'review1',
          app_id: 'test-app-1',
          rating: 5,
          title: '标题1',
          body: '内容1',
          reviewer_nickname: '用户1',
          created_date: '2024-01-01T00:00:00Z',
          is_edited: false,
          first_sync_at: now.toISOString(),
          is_pushed: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        },
        {
          review_id: 'review2',
          app_id: 'test-app-1',
          rating: 4,
          title: '标题2',
          body: '内容2',
          reviewer_nickname: '用户2',
          created_date: '2024-01-02T00:00:00Z',
          is_edited: false,
          first_sync_at: now.toISOString(),
          is_pushed: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        }
      ];
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.select.mockReturnValue(mockClient);
      mockClient.in.mockResolvedValue({ data: mockData, error: null });

      // Act
      const result = await supabaseManager.getAppReviewsByIds(reviewIds);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.has('review1')).toBe(true);
      expect(result.has('review2')).toBe(true);
      
      const review1 = result.get('review1');
      expect(review1?.reviewId).toBe('review1');
      expect(review1?.appId).toBe('test-app-1');
      expect(review1?.rating).toBe(5);
      
      expect(mockClient.from).toHaveBeenCalledWith('app_reviews');
      expect(mockClient.select).toHaveBeenCalledWith('*');
      expect(mockClient.in).toHaveBeenCalledWith('review_id', reviewIds);
    });

    it('应该处理空ID数组', async () => {
      // Arrange
      const reviewIds: string[] = [];

      // Act
      const result = await supabaseManager.getAppReviewsByIds(reviewIds);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(mockClient.from).not.toHaveBeenCalled();
    });
  });

  describe('updateSyncTime', () => {
    it('应该更新应用的同步时间', async () => {
      // Arrange
      const appId = 'test-app-1';
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.upsert.mockResolvedValue({ error: null });

      // Act
      await supabaseManager.updateSyncTime(appId);

      // Assert
      expect(mockClient.from).toHaveBeenCalledWith('sync_log');
      expect(mockClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          app_id: appId,
          last_sync_time: expect.any(String)
        }),
        {
          onConflict: 'app_id'
        }
      );
    });

    it('应该处理更新错误', async () => {
      // Arrange
      const appId = 'test-app-1';
      const dbError = { message: '更新失败', code: 'PGRST003' };
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.upsert.mockResolvedValue({ error: dbError });

      // Act & Assert
      await expect(supabaseManager.updateSyncTime(appId)).rejects.toEqual(dbError);
    });
  });

  describe('getLastSyncTime', () => {
    it('应该返回最后同步时间', async () => {
      // Arrange
      const appId = 'test-app-1';
      const lastSyncTime = '2024-01-01T12:00:00.000Z';
      const mockData = { last_sync_time: lastSyncTime };
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.select.mockReturnValue(mockClient);
      mockClient.eq.mockReturnValue(mockClient);
      mockClient.single.mockResolvedValue({ data: mockData, error: null });

      // Act
      const result = await supabaseManager.getLastSyncTime(appId);

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe(lastSyncTime);
      
      expect(mockClient.from).toHaveBeenCalledWith('sync_log');
      expect(mockClient.select).toHaveBeenCalledWith('last_sync_time');
      expect(mockClient.eq).toHaveBeenCalledWith('app_id', appId);
      expect(mockClient.single).toHaveBeenCalled();
    });

    it('应该处理无记录的情况', async () => {
      // Arrange
      const appId = 'test-app-1';
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.select.mockReturnValue(mockClient);
      mockClient.eq.mockReturnValue(mockClient);
      mockClient.single.mockResolvedValue({ data: null, error: null });

      // Act
      const result = await supabaseManager.getLastSyncTime(appId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateReply', () => {
    it('应该更新评论回复', async () => {
      // Arrange
      const reviewId = 'test-review-1';
      const responseBody = '感谢您的反馈';
      const responseDate = new Date('2024-01-01T12:00:00Z');
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.update.mockReturnValue(mockClient);
      mockClient.eq.mockResolvedValue({ error: null });

      // Act
      await supabaseManager.updateReply(reviewId, responseBody, responseDate);

      // Assert
      expect(mockClient.from).toHaveBeenCalledWith('app_reviews');
      expect(mockClient.update).toHaveBeenCalledWith({
        response_body: responseBody,
        response_date: responseDate.toISOString(),
        updated_at: expect.any(String)
      });
      expect(mockClient.eq).toHaveBeenCalledWith('review_id', reviewId);
    });

    it('应该处理更新错误', async () => {
      // Arrange
      const reviewId = 'test-review-1';
      const responseBody = '感谢您的反馈';
      const responseDate = new Date('2024-01-01T12:00:00Z');
      const dbError = { message: '更新回复失败', code: 'PGRST004' };
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.update.mockReturnValue(mockClient);
      mockClient.eq.mockResolvedValue({ error: dbError });

      // Act & Assert
      await expect(supabaseManager.updateReply(reviewId, responseBody, responseDate))
        .rejects.toEqual(dbError);
    });
  });

  describe('hasReply', () => {
    it('应该返回true当评论有回复时', async () => {
      // Arrange
      const reviewId = 'test-review-1';
      const mockData = { response_body: '感谢您的反馈' };
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.select.mockReturnValue(mockClient);
      mockClient.eq.mockReturnValue(mockClient);
      mockClient.single.mockResolvedValue({ data: mockData, error: null });

      // Act
      const result = await supabaseManager.hasReply(reviewId);

      // Assert
      expect(result).toBe(true);
      expect(mockClient.from).toHaveBeenCalledWith('app_reviews');
      expect(mockClient.select).toHaveBeenCalledWith('response_body');
      expect(mockClient.eq).toHaveBeenCalledWith('review_id', reviewId);
    });

    it('应该返回false当评论没有回复时', async () => {
      // Arrange
      const reviewId = 'test-review-1';
      const mockData = { response_body: null };
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.select.mockReturnValue(mockClient);
      mockClient.eq.mockReturnValue(mockClient);
      mockClient.single.mockResolvedValue({ data: mockData, error: null });

      // Act
      const result = await supabaseManager.hasReply(reviewId);

      // Assert
      expect(result).toBe(false);
    });

    it('应该处理查询错误', async () => {
      // Arrange
      const reviewId = 'test-review-1';
      const dbError = { message: '查询失败', code: 'PGRST005' };
      
      mockClient.from.mockReturnValue(mockClient);
      mockClient.select.mockReturnValue(mockClient);
      mockClient.eq.mockReturnValue(mockClient);
      mockClient.single.mockResolvedValue({ data: null, error: dbError });

      // Act & Assert
      await expect(supabaseManager.hasReply(reviewId)).rejects.toEqual(dbError);
    });
  });
});
