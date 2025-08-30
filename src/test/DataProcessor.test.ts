import { DataProcessor } from '../modules/processor/DataProcessor';
import { AppReview } from '../types';

describe('DataProcessor', () => {
  const now = new Date();
  const mockReviews: AppReview[] = [
    {
      reviewId: 'review1',
      appId: 'app1',
      rating: 5,
      title: '很好的应用',
      body: '这个应用非常好用',
      reviewerNickname: '用户A',
      createdDate: new Date('2024-01-01'),
      isEdited: false,
      firstSyncAt: now,
      isPushed: false,
      createdAt: now,
      updatedAt: now
    },
    {
      reviewId: 'review2',
      appId: 'app1',
      rating: 4,
      title: '不错',
      body: '整体不错',
      reviewerNickname: '用户B',
      createdDate: new Date('2024-01-02'),
      isEdited: false,
      firstSyncAt: now,
      isPushed: false,
      createdAt: now,
      updatedAt: now
    }
  ];

  describe('processReviews', () => {
    it('应该正确分类新评论和已存在评论', () => {
      const existingIds = new Set(['review1']);
      const result = DataProcessor.processReviews(mockReviews, existingIds);

      expect(result.new).toHaveLength(1);
      expect(result.updated).toHaveLength(0); // 根据实际逻辑，已存在的评论被跳过
      expect(result.new[0]?.reviewId).toBe('review2');
    });

    it('应该将所有评论标记为新评论当没有已存在ID时', () => {
      const existingIds = new Set<string>();
      const result = DataProcessor.processReviews(mockReviews, existingIds);

      expect(result.new).toHaveLength(2);
      expect(result.updated).toHaveLength(0);
    });
  });

  describe('validateReview', () => {
    it('应该验证有效的评论', () => {
      const validReview = mockReviews[0]!;
      expect(DataProcessor.validateReview(validReview)).toBe(true);
    });

    it('应该拒绝缺少必需字段的评论', () => {
      const invalidReview: AppReview = { ...mockReviews[0]!, reviewId: '' };
      expect(DataProcessor.validateReview(invalidReview)).toBe(false);
    });

    it('应该拒绝评分超出范围的评论', () => {
      const invalidReview: AppReview = { ...mockReviews[0]!, rating: 6 };
      expect(DataProcessor.validateReview(invalidReview)).toBe(false);
    });
  });

  describe('filterValidReviews', () => {
    it('应该过滤掉无效评论', () => {
      const reviewsWithInvalid: AppReview[] = [
        ...mockReviews,
        { ...mockReviews[0]!, reviewId: 'invalid', rating: 6 }
      ];

      const result = DataProcessor.filterValidReviews(reviewsWithInvalid);
      expect(result).toHaveLength(2);
    });
  });

  describe('deduplicateReviews', () => {
    it('应该去除重复评论', () => {
      const duplicateReviews: AppReview[] = [
        ...mockReviews,
        { ...mockReviews[0]!, reviewId: 'review1' } // 重复ID
      ];

      const result = DataProcessor.deduplicateReviews(duplicateReviews);
      expect(result).toHaveLength(2);
    });
  });

  describe('sortReviewsByDate', () => {
    it('应该按日期降序排序', () => {
      const result = DataProcessor.sortReviewsByDate(mockReviews);
      expect(result[0]?.reviewId).toBe('review2'); // 较新的日期
      expect(result[1]?.reviewId).toBe('review1'); // 较旧的日期
    });
  });

  describe('limitReviews', () => {
    it('应该限制评论数量', () => {
      const result = DataProcessor.limitReviews(mockReviews, 1);
      expect(result).toHaveLength(1);
    });

    it('不应该限制当数量在限制范围内时', () => {
      const result = DataProcessor.limitReviews(mockReviews, 10);
      expect(result).toHaveLength(2);
    });
  });
});
