This folder contains sample outputs used for development and testing.

- `comments_example.json` — sample tweet/comment objects returned by the tweet scraper.
- `followers_of_target_page.json` — sample list of followers for a target account (used to check if a user follows a page).

These files are example data only. In production the service fetches live data from Apify scrapers.

Keep these files under `NODE_ENV=development` for fast local testing.
