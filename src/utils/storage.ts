import * as fs from "fs";
import type { Tweet } from "@/types/Tweet";

/**
 * Save tweets to a JSON file, deduplicating based on complete tweet object
 * @param tweets Array of tweets to save
 * @param outputFile Path to the output file
 */
export function saveTweets(
  tweets: Tweet[],
  outputFile: string = "tweets.json"
): void {
  // Load existing tweets if file exists
  let existingTweets: Tweet[] = [];
  if (fs.existsSync(outputFile)) {
    try {
      const data = fs.readFileSync(outputFile, "utf-8");
      existingTweets = JSON.parse(data) as Tweet[];
      console.log(
        `Loaded ${existingTweets.length} existing tweets from ${outputFile}`
      );
    } catch (error) {
      console.error(`Error loading existing tweets: ${error}`);
    }
  }

  // Combine tweets and deduplicate using Set
  const uniqueTweets = Array.from(
    new Set(
      [...existingTweets, ...tweets].map((tweet) => JSON.stringify(tweet))
    )
  ).map((str) => JSON.parse(str));

  // Sort by timestamp (newest first)
  uniqueTweets.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return b.timestamp - a.timestamp;
    }
    return b.id.localeCompare(a.id);
  });

  // Save to file
  fs.writeFileSync(outputFile, JSON.stringify(uniqueTweets, null, 2));
  console.log(
    `Saved ${uniqueTweets.length} tweets to ${outputFile} (${
      uniqueTweets.length - existingTweets.length
    } new)`
  );
}
