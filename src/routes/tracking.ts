import { Router, Request, Response } from "express";
import { ApifyService } from "../services/ApifyService";
import {
  ApiResponse,
  TweetData,
  FollowersData,
  SearchQuery,
  TrackUserOptions,
} from "../types";

const router = Router();
const apifyService = new ApifyService();

// Track specific tweet
router.post("/tweet", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tweetUrl } = req.body;
    if (!tweetUrl || typeof tweetUrl !== "string") {
      res.status(400).json({
        success: false,
        error: "tweetUrl is required and must be a string",
      } as ApiResponse);
      return;
    }

    const result: TweetData = await apifyService.trackTweet(tweetUrl);
    res.json({
      success: true,
      data: result,
    } as ApiResponse<TweetData>);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: errorMessage,
    } as ApiResponse);
  }
});

// Track user
router.post("/user", async (req: Request, res: Response): Promise<void> => {
  try {
    const { handle, ...options } = req.body;
    if (!handle || typeof handle !== "string") {
      res.status(400).json({
        success: false,
        error: "handle is required and must be a string",
      } as ApiResponse);
      return;
    }

    const result: TweetData[] = await apifyService.trackUser(
      handle,
      options as TrackUserOptions
    );
    res.json({
      success: true,
      data: result,
    } as ApiResponse<TweetData[]>);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: errorMessage,
    } as ApiResponse);
  }
});

// Get followers
router.post(
  "/followers",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { handle } = req.body;
      if (!handle || typeof handle !== "string") {
        res.status(400).json({
          success: false,
          error: "handle is required and must be a string",
        } as ApiResponse);
        return;
      }

      const result: FollowersData = await apifyService.getFollowers(handle);
      res.json({
        success: true,
        data: result,
      } as ApiResponse<FollowersData>);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: errorMessage,
      } as ApiResponse);
    }
  }
);

// Search tweets
router.post("/search", async (req: Request, res: Response): Promise<void> => {
  try {
    const query: SearchQuery = req.body;

    // Basic validation
    if (!query.searchTerms && !query.twitterHandles && !query.conversationIds) {
      res.status(400).json({
        success: false,
        error:
          "At least one of searchTerms, twitterHandles, or conversationIds is required",
      } as ApiResponse);
      return;
    }

    const result: TweetData[] = await apifyService.searchTweets(query);
    res.json({
      success: true,
      data: result,
    } as ApiResponse<TweetData[]>);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: errorMessage,
    } as ApiResponse);
  }
});

export default router;
