import { Hyperbrowser } from '@hyperbrowser/sdk';

export function getClient(): Hyperbrowser {
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    throw new Error('HYPERBROWSER_API_KEY environment variable is required');
  }
  return new Hyperbrowser({ apiKey });
}

export async function withClient<T>(
  operation: (client: Hyperbrowser) => Promise<T>
): Promise<T> {
  const client = getClient();
  return await operation(client);
} 