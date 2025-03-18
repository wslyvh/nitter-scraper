import * as cheerio from "cheerio";
import type { Tweet } from "@/types/Tweet";
import { formatDate, getDateFromTimestamp } from "@/utils/dateUtils";

// Constants
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15";
const BASE_URL = "https://nitter.net";
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds delay between requests

/**
 * Extract tweets and next cursor from HTML content
 */
function extractTweetsFromHtml(
  html: string,
  username: string,
  existingTweets: Map<string, Tweet>
): {
  tweets: Tweet[];
  nextCursor: string | null;
} {
  const $ = cheerio.load(html);
  const tweets: Tweet[] = [];
  let nextCursor: string | null = null;

  // Find the "Load more" link to get the next cursor
  $("a").each((_, element) => {
    const href = $(element).attr("href");
    const text = $(element).text().trim();

    if (href && href.includes("cursor=") && text.includes("Load more")) {
      const cursorMatch = href.match(/cursor=([^&]+)/);
      if (cursorMatch && cursorMatch[1]) {
        nextCursor = cursorMatch[1];
      }
    }
  });

  // Extract tweets
  $(".timeline-item").each((_, element) => {
    try {
      const tweetElement = $(element);

      // Skip pinned tweets
      if (tweetElement.find(".pinned").length > 0) {
        return;
      }

      // Extract tweet ID from the permalink
      const permalink = tweetElement.find(".tweet-link").attr("href");
      const id = permalink ? permalink.split("/").pop() || "" : "";

      // Clean the ID by removing the "#m" suffix if present
      const cleanId = id.replace(/#m$/, "");

      if (!cleanId) {
        return; // Skip if no ID
      }

      // Skip if we already have this tweet
      if (existingTweets.has(cleanId)) {
        return;
      }

      const text = tweetElement.find(".tweet-content").text().trim();

      // Get timestamp and full date from title attribute
      const timestampElement = tweetElement.find(".tweet-date a");
      const timestamp = timestampElement.text().trim();
      const dateStr = timestampElement.attr("title");

      // Parse the date from the timestamp
      const date = getDateFromTimestamp(timestamp, dateStr);

      // Create tweet object
      const tweet: Tweet = {
        id: cleanId,
        text,
        username,
        created_at: formatDate(date),
        timestamp: date ? Math.floor(date.getTime() / 1000) : null,
      };

      tweets.push(tweet);
      existingTweets.set(cleanId, tweet);
    } catch (error) {
      console.error(`Error extracting tweet: ${error}`);
    }
  });

  return { tweets, nextCursor };
}

/**
 * Fetch a single page of tweets
 */
async function fetchTweetsPage(
  username: string,
  cursor: string | null,
  pageNumber: number
): Promise<{ html: string; status: number }> {
  let url = `${BASE_URL}/${username}/with_replies`;
  if (cursor) {
    url += `?cursor=${cursor}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (response.status === 429) {
      console.log("Rate limit exceeded. Waiting 30 seconds before retrying...");
      await new Promise((resolve) => setTimeout(resolve, 30000));
      return fetchTweetsPage(username, cursor, pageNumber);
    }

    const html = await response.text();
    return { html, status: response.status };
  } catch (error) {
    console.error(`Error fetching tweets: ${error}`);
    return { html: "", status: 500 };
  }
}

/**
 * Fetch tweets from Nitter for a given username
 * @param username Twitter username to scrape (without @)
 * @param maxPages Maximum number of pages to fetch (default: 3)
 * @returns Promise containing an array of tweets
 */
export async function fetchTweets(
  username: string,
  maxPages: number = 3
): Promise<Tweet[]> {
  let cursor: string | null = null;
  let pageNumber = 1;
  let allTweets: Tweet[] = [];
  const existingTweets = new Map<string, Tweet>();

  while (pageNumber <= maxPages) {
    const { html, status } = await fetchTweetsPage(
      username,
      cursor,
      pageNumber
    );

    if (status !== 200 || !html) {
      console.error(`Failed to fetch page ${pageNumber}, status: ${status}`);
      break;
    }

    const { tweets, nextCursor } = extractTweetsFromHtml(
      html,
      username,
      existingTweets
    );
    allTweets = [...allTweets, ...tweets];

    if (!nextCursor) {
      break;
    }

    cursor = nextCursor;
    pageNumber++;

    if (pageNumber <= maxPages) {
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_REQUESTS)
      );
    }
  }

  return allTweets;
}
