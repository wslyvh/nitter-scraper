# Nitter Scraper

A TypeScript package for scraping tweets from Nitter without authentication.

## Installation

```bash
# Install as a library
npm install nitter-scraper

# Or install globally to use as CLI
npm install -g nitter-scraper
```

## Usage

### As a Library

```typescript
import { fetchTweets } from "nitter-scraper";

async function main() {
  const tweets = await fetchTweets("username", 3); // username without @, max pages (optional)
  console.log(`Found ${tweets.length} tweets`);
}

main().catch(console.error);
```

### As a CLI Tool

```bash
# Run the scraper using Bun
bun run cli

# Or if installed globally
nitter-scraper
```

## Features

- Fetches tweets from Nitter without authentication
- Handles pagination automatically
- Built-in rate limiting protection
- TypeScript support

## API

### fetchTweets

```typescript
fetchTweets(username: string, maxPages?: number): Promise<Tweet[]>
```

Parameters:

- `username`: Twitter username to scrape (without @)
- `maxPages`: Maximum number of pages to fetch (default: 3)

### Tweet Type

```typescript
interface Tweet {
  id: string;
  text: string;
  username: string;
  created_at: string | null;
  timestamp: number | null;
  replies: number;
  retweets: number;
  likes: number;
  type: "tweet" | "retweet" | "reply";
  reference?: {
    id: string;
    username: string;
  };
}
```

## License

MIT
