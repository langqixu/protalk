import { buildReviewCardV2 } from '../utils/feishu-card-v2-builder';
import { CardState, ReviewDTO } from '../types/review';

describe('buildReviewCardV2', () => {
  const mockReview: ReviewDTO = {
    id: 'test_review_123',
    appId: 'test_app_456',
    appName: 'Test App',
    rating: 4,
    title: 'Great App!',
    body: 'This is a test review.',
    author: 'Test User',
    createdAt: '2023-10-27T10:00:00Z',
    version: '1.0.0',
    countryCode: 'US',
    developerResponse: {
      body: 'Thank you for your feedback!',
      lastModified: '2023-10-27T11:00:00Z',
    },
  };

  it('should match snapshot for NO_REPLY state', () => {
    const card = buildReviewCardV2(mockReview, CardState.NO_REPLY);
    expect(card).toMatchSnapshot();
  });

  it('should match snapshot for REPLYING state', () => {
    const card = buildReviewCardV2(mockReview, CardState.REPLYING);
    expect(card).toMatchSnapshot();
  });

  it('should match snapshot for REPLIED state', () => {
    const card = buildReviewCardV2(mockReview, CardState.REPLIED);
    expect(card).toMatchSnapshot();
  });

  it('should match snapshot for EDITING_REPLY state', () => {
    const card = buildReviewCardV2(mockReview, CardState.EDITING_REPLY);
    expect(card).toMatchSnapshot();
  });
});
