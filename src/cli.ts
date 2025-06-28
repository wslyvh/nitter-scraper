#!/usr/bin/env node

import { fetchTweets } from "./scraper";
import { saveTweets } from "./utils/storage";

async function main() {
  try {
    const username = "wslyvh"; // Twitter username to scrape (without @)
    console.log(`Starting Twitter scraper for @${username}`);

    // Fetch tweets
    const tweets = await fetchTweets(username, 3, true);

    // Save tweets to file
    saveTweets(tweets);
  } catch (error) {
    console.error(`Error in main function: ${error}`);
  }
}

// Run the main function
main().catch(console.error);
