export async function retry<T>(
  fn: () => Promise<T>,
  nrOfTries: number = 1,
  delayMs: number = 2000
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= nrOfTries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < nrOfTries) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }
  throw lastError;
}
