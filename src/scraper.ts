import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import type { Tweet } from "@/types/Tweet";
import { formatDate, getDateFromTimestamp } from "@/utils/dateUtils";

// Constants
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15";
const BASE_URL = "https://nitter.net";
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds delay between requests

/**
 * Twitter Scraper class for fetching tweets from Nitter
 */
export class TwitterScraper {
  private username: string;
  private maxPages: number;
  private saveResponses: boolean;
  private responsesDir: string;
  private outputFile: string;
  private existingTweets: Map<string, Tweet>;

  /**
   * Create a new TwitterScraper instance
   *
   * @param username Twitter username to scrape (without @)
   * @param maxPages Maximum number of pages to fetch (default: 10)
   * @param saveResponses Whether to save HTML responses for inspection (default: true)
   * @param responsesDir Directory to save HTML responses (default: "responses")
   * @param outputFile File to save tweets to (default: "tweets.json")
   */
  constructor(
    username: string,
    maxPages: number = 10,
    saveResponses: boolean = true,
    responsesDir: string = "responses",
    outputFile: string = "tweets.json"
  ) {
    this.username = username;
    this.maxPages = maxPages;
    this.saveResponses = saveResponses;
    this.responsesDir = responsesDir;
    this.outputFile = outputFile;
    this.existingTweets = new Map();

    // Create responses directory if it doesn't exist
    if (this.saveResponses && !fs.existsSync(this.responsesDir)) {
      fs.mkdirSync(this.responsesDir, { recursive: true });
    }

    // Load existing tweets if the file exists
    this.loadExistingTweets();
  }

  /**
   * Load existing tweets from the output file
   */
  private loadExistingTweets(): void {
    if (fs.existsSync(this.outputFile)) {
      try {
        const data = fs.readFileSync(this.outputFile, "utf-8");
        const tweets = JSON.parse(data) as Tweet[];
        tweets.forEach((tweet) => {
          this.existingTweets.set(tweet.id, tweet);
        });
        console.log(
          `Loaded ${this.existingTweets.size} existing tweets from ${this.outputFile}`
        );
      } catch (error) {
        console.error(`Error loading existing tweets: ${error}`);
      }
    }
  }

  /**
   * Save tweets to the output file
   *
   * @param newTweets New tweets to save
   */
  private saveTweets(newTweets: Tweet[]): void {
    // Get all tweets (existing + new)
    const allTweets = Array.from(this.existingTweets.values());

    // Sort tweets by date (newest first)
    allTweets.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return b.timestamp - a.timestamp;
      }

      // Fallback to string comparison
      return b.id.localeCompare(a.id);
    });

    // Write to file
    fs.writeFileSync(this.outputFile, JSON.stringify(allTweets, null, 2));
    console.log(
      `Saved ${allTweets.length} tweets to ${this.outputFile} (${newTweets.length} new)`
    );
  }

  /**
   * Extract tweets and next cursor from HTML content
   *
   * @param html HTML content
   * @returns Object containing tweets and next cursor
   */
  private extractTweetsFromHtml(html: string): {
    tweets: Tweet[];
    nextCursor: string | null;
  } {
    const $ = cheerio.load(html);
    const tweets: Tweet[] = [];
    let nextCursor: string | null = null;

    // Find all links in the page for debugging (only log cursor links)
    let cursorLinksFound = 0;
    $("a").each((_, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();
      if (href && href.includes("cursor=")) {
        cursorLinksFound++;
      }
    });
    console.log(`Found ${cursorLinksFound} links with cursors`);

    // Find the "Load more" link to get the next cursor
    // Look for any link that contains "cursor=" in the href
    $("a").each((_, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();

      if (href && href.includes("cursor=") && text.includes("Load more")) {
        const cursorMatch = href.match(/cursor=([^&]+)/);
        if (cursorMatch && cursorMatch[1]) {
          nextCursor = cursorMatch[1];
          console.log(`Found next cursor from "${text}" link: ${nextCursor}`);
        }
      }
    });

    // If we still don't have a cursor, try a more general approach
    if (!nextCursor) {
      // Look for any link in the show-more div
      const showMoreLinks = $(".show-more a");
      showMoreLinks.each((_, element) => {
        const href = $(element).attr("href");
        if (href && href.includes("cursor=")) {
          const cursorMatch = href.match(/cursor=([^&]+)/);
          if (cursorMatch && cursorMatch[1]) {
            nextCursor = cursorMatch[1];
            console.log(`Found next cursor from show-more div: ${nextCursor}`);
          }
        }
      });
    }

    // If we still don't have a cursor, try an even more general approach
    if (!nextCursor) {
      // Look for any link that contains "cursor=" in the href
      $("a").each((_, element) => {
        const href = $(element).attr("href");
        if (href && href.includes("cursor=")) {
          const cursorMatch = href.match(/cursor=([^&]+)/);
          if (cursorMatch && cursorMatch[1]) {
            nextCursor = cursorMatch[1];
            console.log(`Found next cursor from general link: ${nextCursor}`);
          }
        }
      });
    }

    if (!nextCursor) {
      console.log("No cursor found in the page");
    }

    // Count timeline items for debugging
    const timelineItems = $(".timeline-item");
    console.log(`Found ${timelineItems.length} timeline items`);

    // Track stats for logging
    let skippedPinned = 0;
    let skippedNoId = 0;
    let skippedExisting = 0;
    let newTweets = 0;

    // Extract tweets
    timelineItems.each((_, element) => {
      try {
        const tweetElement = $(element);

        // Skip pinned tweets
        if (tweetElement.find(".pinned").length > 0) {
          skippedPinned++;
          return;
        }

        // Extract tweet ID from the permalink
        const permalink = tweetElement.find(".tweet-link").attr("href");
        const id = permalink ? permalink.split("/").pop() || "" : "";

        // Clean the ID by removing the "#m" suffix if present
        const cleanId = id.replace(/#m$/, "");

        if (!cleanId) {
          skippedNoId++;
          return; // Skip if no ID
        }

        // Skip if we already have this tweet
        if (this.existingTweets.has(cleanId)) {
          skippedExisting++;
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
          username: this.username,
          created_at: formatDate(date),
          timestamp: date ? Math.floor(date.getTime() / 1000) : null,
        };

        newTweets++;
        tweets.push(tweet);
        this.existingTweets.set(cleanId, tweet);
      } catch (error) {
        console.error(`Error extracting tweet: ${error}`);
      }
    });

    console.log(
      `Tweet extraction stats: ${newTweets} new, ${skippedExisting} existing, ${skippedPinned} pinned, ${skippedNoId} without ID`
    );
    return { tweets, nextCursor };
  }

  /**
   * Fetch a single page of tweets
   *
   * @param cursor Cursor for pagination
   * @param pageNumber Page number for logging
   * @returns Object containing HTML content and response status
   */
  private async fetchTweetsPage(
    cursor: string | null,
    pageNumber: number
  ): Promise<{ html: string; status: number }> {
    // Construct URL with cursor if provided
    let url = `${BASE_URL}/${this.username}/with_replies`;
    if (cursor) {
      url += `?cursor=${cursor}`;
    }

    console.log(`Fetching page ${pageNumber} from ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        console.log(
          "Rate limit exceeded. Waiting 30 seconds before retrying..."
        );
        await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

        // Try again
        console.log(`Retrying page ${pageNumber}...`);
        return this.fetchTweetsPage(cursor, pageNumber);
      }

      const html = await response.text();
      console.log(`Received HTML response (${html.length} characters)`);

      // Save response for inspection if enabled
      if (this.saveResponses) {
        fs.writeFileSync(
          path.join(this.responsesDir, `response-${pageNumber}.html`),
          html
        );
        console.log(
          `Saved HTML response to ${path.join(
            this.responsesDir,
            `response-${pageNumber}.html`
          )}`
        );
      }

      return { html, status: response.status };
    } catch (error) {
      console.error(`Error fetching tweets: ${error}`);
      return { html: "", status: 500 };
    }
  }

  /**
   * Fetch all tweets with pagination
   */
  public async fetchAllTweets(): Promise<Tweet[]> {
    let cursor: string | null = null;
    let pageNumber = 1;
    let allNewTweets: Tweet[] = [];

    while (pageNumber <= this.maxPages) {
      // Fetch page
      const { html, status } = await this.fetchTweetsPage(cursor, pageNumber);

      if (status !== 200 || !html) {
        console.error(`Failed to fetch page ${pageNumber}, status: ${status}`);
        break;
      }

      // Extract tweets and next cursor
      const { tweets, nextCursor } = this.extractTweetsFromHtml(html);

      // Add new tweets to the collection
      allNewTweets = [...allNewTweets, ...tweets];
      console.log(`Added ${tweets.length} new tweets from page ${pageNumber}`);

      // Save tweets after each page
      this.saveTweets(allNewTweets);

      // Log if no new tweets were found but continue anyway
      if (tweets.length === 0) {
        console.log(
          `No new tweets found on page ${pageNumber}, but continuing pagination...`
        );
      }

      // Break if no next cursor
      if (!nextCursor) {
        console.log("No next cursor found. Stopping pagination.");
        break;
      }

      // Update cursor for next page
      cursor = nextCursor;
      pageNumber++;

      // Add delay between requests to avoid rate limiting
      if (pageNumber <= this.maxPages) {
        console.log(
          `Waiting ${DELAY_BETWEEN_REQUESTS}ms before next request...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_REQUESTS)
        );
      }
    }

    if (pageNumber > this.maxPages) {
      console.log(
        `Reached maximum number of pages (${this.maxPages}). Stopping.`
      );
    }

    return allNewTweets;
  }

  /**
   * Fetch tweets with pagination
   */
  public async fetchTweets(): Promise<Tweet[]> {
    return this.fetchAllTweets();
  }
}
