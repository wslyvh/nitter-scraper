# Nitter Scraper

A TypeScript package for scraping tweets from Nitter without authentication.

## Installation

```bash
npm install nitter-scraper
```

## Usage

```typescript
import { fetchTweets } from "nitter-scraper";

async function main() {
  const tweets = await fetchTweets("username", 3); // username without @, max pages (optional)
  console.log(`Found ${tweets.length} tweets`);
}

main().catch(console.error);
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
  created_at: string;
  timestamp: number | null;
}
```

## License

MIT
