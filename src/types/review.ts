/**
 * @file review.ts
 * @description Defines the data transfer objects (DTOs) and state enums for app reviews.
 * This file serves as the single source of truth for review-related data structures.
 */

/**
 * Defines the possible states of an interactive review card.
 */
export enum CardState {
  /**
   * Initial state for a new, unreplied review.
   * Displays a "Reply" button.
   */
  NO_REPLY = 'no_reply',

  /**
   * State when the user is actively composing a reply.
   * Displays a text input form with "Submit" and "Cancel" buttons.
   */
  REPLYING = 'replying',

  /**
   * State after a reply has been submitted.
   * Displays the developer's response and an "Edit" button.
   */
  REPLIED = 'replied',

  /**
   * State when the user is editing a previously submitted reply.
   * Displays a pre-filled text input form with "Update" and "Cancel" buttons.
   */
  EDITING_REPLY = 'editing_reply',
}

/**
 * Data Transfer Object for an App Store Review.
 * This unified interface is used across the application to ensure consistency.
 */
export interface ReviewDTO {
  // --- Core Identifiers ---
  id: string;
  appId: string;
  appName: string;

  // --- Review Content ---
  rating: number; // 1 to 5
  title: string;
  body: string;
  author: string;
  
  // --- Metadata ---
  createdAt: string; // ISO 8601 date string
  version: string;
  countryCode: string; // e.g., "CN", "US"

  // --- Developer Response ---
  developerResponse?: {
    body: string;
    lastModified: string; // ISO 8601 date string
  };
  
  // --- Card-specific data (optional) ---
  messageId?: string;
}
