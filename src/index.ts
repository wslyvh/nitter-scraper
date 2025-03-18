import { TwitterScraper } from "./scraper";

async function main() {
  try {
    const username = "wslyvh"; // Twitter username to scrape (without @)
    const maxPages = 10; // Maximum number of pages to fetch
    const saveResponses = true; // Whether to save HTML responses for inspection
    const responsesDir = "responses"; // Directory to save HTML responses
    const outputFile = "tweets.json"; // File to save tweets to

    console.log(`Starting Twitter scraper for @${username}`);

    // Create and run the scraper
    const scraper = new TwitterScraper(
      username,
      maxPages,
      saveResponses,
      responsesDir,
      outputFile
    );

    const tweets = await scraper.fetchTweets();

    console.log(`Finished scraping. Found ${tweets.length} new tweets.`);
  } catch (error) {
    console.error(`Error in main function: ${error}`);
  }
}

// Run the main function
main().catch(console.error);
