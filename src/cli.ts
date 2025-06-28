#!/usr/bin/env node

import { fetchTweets } from "./scraper";
import { saveTweets } from "./utils/storage";

async function main() {
  try {
    const username = "wslyvh"; // Twitter username to scrape (without @)
    console.log(`Starting Twitter scraper for @${username}`);

    // Fetch tweets
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const tweets = await fetchTweets(username, lastWeek, 3, true);

    // Save tweets to file
    saveTweets(tweets);
  } catch (error) {
    console.error(`Error in main function: ${error}`);
  }
}

// Run the main function
main().catch(console.error);
