# Twitter Media Tracker

A small service that verifies specific Twitter interactions (follow and comment) using Apify scrapers. This repository is prepared to be deployed as a Railway template.

## Features

- Verify if a user follows a target account
- Verify if a user commented on a specific tweet

## Limitations

- Likes are not detectable via the scrapers used (Twitter/API limitation)
- Retweets/reposts are not distinguished (technical limitation)

## Quick deploy (Railway)

1. Fork this repository
2. Connect the fork to Railway
3. Add environment variables:
   - `APIFY_TOKEN` — Apify API token
   - `NODE_ENV` — `development` or `production`

## API

POST /api/interactions/verify

Payload (JSON):

```json
{
  "user": "username",
  "tweetUrl": "https://x.com/user/status/123456789",
  "targetPage": "target_page",
  "timeFilter": { "since": "2024-01-01", "until": "2024-12-31" }
}
```

Response (JSON):

```json
{
  "success": true,
  "data": {
    "user": "username",
    "following": true,
    "commented": false,
    "score": 1,
    "timestamp": "2024-01-01T10:00:00.000Z"
  }
}
```

Other endpoints:

- `GET /api/interactions/status` — Service status
- `GET /api/interactions/test` — Test using sample data
- `POST /api/interactions/generate-examples` — Generate example outputs (development only)

## Implementation notes

- Uses Apify scrapers for followers and tweet comments
- Caches follower results for 24h to reduce calls
- Time-range filters (`since`/`until`) used to limit comment searches

## Apify actors (required)

This service relies on two Apify actors. You must add both actors to your Apify account and ensure your account has sufficient credits (Starter plan or higher) — free accounts are often blocked from running these actors due to abuse.

- https://apify.com/apidojo/twitter-user-scraper — follower lists and user profile data
- https://apify.com/apidojo/tweet-scraper — tweet and comment extraction

How to configure:

1. Sign in to your Apify account and add each actor to your account (open the actor page and choose "Add to account" / "Start actor").
2. Ensure your Apify account has enough credits (Starter plan or higher) — the actors may be blocked or limited on free accounts.
3. Set `APIFY_TOKEN` in Railway environment variables so the service can call the actors.

If the actors are not added or your account lacks credits, API calls to Apify will fail. The requirement for paid plans is due to developer-enforced limits to prevent abuse (multiple free accounts). If you want, I can add a short troubleshooting bullet to this doc to help surface common Apify errors.

## Run

Development (uses local examples):

```bash
NODE_ENV=development npm run dev
```

Production:

```bash
NODE_ENV=production npm start
```

## Examples

See the `examples/` folder for sample payloads and outputs.

## Notes for Railway template

- Ensure `APIFY_TOKEN` is set in Railway environment variables.
- The service requires Node.js >= 18.
