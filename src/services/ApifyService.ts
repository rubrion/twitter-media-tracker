import { ApifyClient } from "apify-client";
import { config } from "../config";
import {
  TweetData,
  TrackTweetOptions,
  TrackUserOptions,
  SearchQuery,
  FollowersData,
  parseApifyTweetItem,
  parseApifyTweetData,
} from "../types";

export class ApifyService {
  private client: ApifyClient;
  private actorId: string;

  constructor() {
    this.client = new ApifyClient({
      token: config.apify.token,
    });
    this.actorId = config.apify.actorId;
  }

  /**
   * Track specific tweet by URL
   */
  async trackTweet(
    tweetUrl: string,
    options: TrackTweetOptions = {}
  ): Promise<TweetData> {
    try {
      const input = {
        startUrls: [tweetUrl],
        maxItems: 1,
        includeSearchTerms: false,
        onlyVerifiedUsers: false,
        onlyTwitterBlue: false,
        onlyImage: false,
        onlyVideo: false,
        onlyQuote: false,
      };

      const run = await this.client.actor(this.actorId).call(input);
      const response = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      if (response.items.length === 0) {
        throw new Error("No tweet data found");
      }

      const tweetData = parseApifyTweetItem(response.items[0]);
      if (!tweetData) {
        throw new Error("Invalid tweet data format received from Apify");
      }

      return tweetData;
    } catch (error) {
      console.error("Error tracking tweet:", error);
      throw error;
    }
  }

  /**
   * Track user tweets and profile data
   */
  async trackUser(
    handle: string,
    options: TrackUserOptions = {}
  ): Promise<TweetData[]> {
    try {
      const maxTweets = Math.max(options.maxTweets || 100, 50);

      const input = {
        searchTerms: [`from:${handle}`],
        maxItems: maxTweets,
        includeSearchTerms: false,
        onlyVerifiedUsers: false,
        onlyTwitterBlue: false,
        onlyImage: false,
        onlyVideo: false,
        onlyQuote: false,
        sort: options.sort || "Latest",
        ...(options.tweetLanguage && { tweetLanguage: options.tweetLanguage }),
        ...(options.dateRange?.start && { start: options.dateRange.start }),
        ...(options.dateRange?.end && { end: options.dateRange.end }),
      };

      const run = await this.client.actor(this.actorId).call(input);
      const response = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      const validTweets = parseApifyTweetData(response.items);
      return validTweets;
    } catch (error) {
      console.error("Error tracking user:", error);
      throw error;
    }
  }

  /**
   * Search tweets with advanced filtering
   */
  async searchTweets(query: SearchQuery): Promise<TweetData[]> {
    try {
      const maxItems = Math.max(query.maxItems || 100, 50);

      const input = {
        searchTerms: query.searchTerms || [],
        twitterHandles: query.twitterHandles || [],
        conversationIds: query.conversationIds || [],
        maxItems: maxItems,
        includeSearchTerms: query.includeSearchTerms || false,
        onlyVerifiedUsers: query.onlyVerifiedUsers || false,
        onlyTwitterBlue: query.onlyTwitterBlue || false,
        onlyImage: query.onlyImage || false,
        onlyVideo: query.onlyVideo || false,
        onlyQuote: query.onlyQuote || false,
        sort: query.sort || "Latest",
        ...(query.tweetLanguage && { tweetLanguage: query.tweetLanguage }),
        ...(query.author && { author: query.author }),
        ...(query.inReplyTo && { inReplyTo: query.inReplyTo }),
        ...(query.mentioning && { mentioning: query.mentioning }),
        ...(query.geotaggedNear && { geotaggedNear: query.geotaggedNear }),
        ...(query.withinRadius && { withinRadius: query.withinRadius }),
        ...(query.geocode && { geocode: query.geocode }),
        ...(query.placeObjectId && { placeObjectId: query.placeObjectId }),
        ...(query.minimumRetweets && {
          minimumRetweets: query.minimumRetweets,
        }),
        ...(query.minimumFavorites && {
          minimumFavorites: query.minimumFavorites,
        }),
        ...(query.minimumReplies && { minimumReplies: query.minimumReplies }),
        ...(query.start && { start: query.start }),
        ...(query.end && { end: query.end }),
      };

      const run = await this.client.actor(this.actorId).call(input);
      const response = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      const validTweets = parseApifyTweetData(response.items);
      return validTweets;
    } catch (error) {
      console.error("Error searching tweets:", error);
      throw error;
    }
  }

  /**
   * Get followers count from user profile
   */
  async getFollowers(handle: string): Promise<FollowersData> {
    try {
      // Get one tweet from user to extract profile data with follower count
      const input = {
        searchTerms: [`from:${handle}`],
        maxItems: 1,
        includeSearchTerms: false,
        onlyVerifiedUsers: false,
      };

      const run = await this.client.actor(this.actorId).call(input);
      const response = await this.client
        .dataset(run.defaultDatasetId)
        .listItems();

      if (response.items.length === 0) {
        throw new Error("No user data found");
      }

      const tweetData = parseApifyTweetItem(response.items[0]);
      if (!tweetData) {
        throw new Error("Invalid tweet data format received from Apify");
      }

      const author = tweetData.author;
      return {
        handle: handle,
        followers: author.followers || 0,
        following: author.following || 0,
        profileData: author,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting followers:", error);
      throw error;
    }
  }
}
