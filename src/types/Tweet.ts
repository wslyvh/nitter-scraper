export interface Tweet {
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
