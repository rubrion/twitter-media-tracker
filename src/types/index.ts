// Apify Tweet Scraper V2 Types

export interface MediaEntity {
  type: string;
  url: string;
  mediaUrl?: string;
  [key: string]: unknown;
}

export interface TweetAuthor {
  type: string;
  userName: string;
  url: string;
  twitterUrl: string;
  id: string;
  name: string;
  isVerified: boolean;
  isBlueVerified: boolean;
  verifiedType?: string;
  hasNftAvatar: boolean;
  profilePicture: string;
  coverPicture?: string;
  description: string;
  location: string;
  followers: number;
  following: number;
  protected: boolean;
  status: string;
  canDm: boolean;
  canMediaTag: boolean;
  createdAt: string;
  favouritesCount: number;
  statusesCount: number;
}

export interface TweetData {
  type: string;
  id: string;
  url: string;
  twitterUrl: string;
  text: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  createdAt: string;
  lang: string;
  bookmarkCount: number;
  isReply: boolean;
  isRetweet: boolean;
  isQuote: boolean;
  author: TweetAuthor;
  extendedEntities?: Record<string, unknown>;
  media?: MediaEntity[];
}

export interface TrackTweetOptions {
  metrics?: string[];
}

export interface TrackUserOptions {
  maxTweets?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  sort?: "Latest" | "Top" | "Photos" | "Videos";
  tweetLanguage?: string;
}

export interface SearchQuery {
  searchTerms?: string[];
  twitterHandles?: string[];
  conversationIds?: string[];
  maxItems?: number;
  includeSearchTerms?: boolean;
  onlyVerifiedUsers?: boolean;
  onlyTwitterBlue?: boolean;
  onlyImage?: boolean;
  onlyVideo?: boolean;
  onlyQuote?: boolean;
  tweetLanguage?: string;
  author?: string;
  inReplyTo?: string;
  mentioning?: string;
  geotaggedNear?: string;
  withinRadius?: string;
  geocode?: string;
  placeObjectId?: string;
  minimumRetweets?: number;
  minimumFavorites?: number;
  minimumReplies?: number;
  start?: string;
  end?: string;
  sort?: "Latest" | "Top" | "Photos" | "Videos";
}

export interface FollowersData {
  handle: string;
  followers: number;
  following: number;
  profileData: TweetAuthor;
  timestamp: string;
}

export interface ApifyRunResult {
  defaultDatasetId: string;
}

export interface ApifyDatasetItems {
  items: TweetData[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Type guards for runtime validation
export function isTweetData(data: unknown): data is TweetData {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).id === "string" &&
    typeof (data as Record<string, unknown>).text === "string" &&
    typeof (data as Record<string, unknown>).author === "object" &&
    (data as Record<string, unknown>).author !== null
  );
}

export function isTweetAuthor(data: unknown): data is TweetAuthor {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).userName === "string" &&
    typeof (data as Record<string, unknown>).followers === "number"
  );
}

// Utility functions to safely parse Apify response
export function parseApifyTweetData(items: unknown[]): TweetData[] {
  return items.filter(isTweetData);
}

export function parseApifyTweetItem(item: unknown): TweetData | null {
  return isTweetData(item) ? item : null;
}
