import { createClient, Client } from 'graphql-ws';

interface SubscriptionOptions {
  query: string;
  variables?: Record<string, any>;
  onNext: (data: any) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface HasuraClientConfig {
  url: string;
  headers?: Record<string, string>;
}

class HasuraSubscriptionClient {
  private client: Client;
  private static instance: HasuraSubscriptionClient;

  private constructor(config: HasuraClientConfig) {
    this.client = createClient({
      url: config.url,
      connectionParams: async () => {
        const res = await fetch('/api/graphql/ws-token');
        const { token } = await res.json();
        return {
          headers: {
            'x-hasura-admin-secret': token,
            ...config.headers,
            'Content-Type': 'application/json',
          },
        };
      },
    });
  }

  public static getInstance(config: HasuraClientConfig): HasuraSubscriptionClient {
    if (!HasuraSubscriptionClient.instance) {
      HasuraSubscriptionClient.instance = new HasuraSubscriptionClient(config);
    }
    return HasuraSubscriptionClient.instance;
  }

  public subscribe(options: SubscriptionOptions) {
    const { query, variables, onNext, onError, onComplete } = options;

    return this.client.subscribe(
      { query, variables },
      {
        next: onNext,
        error: (error) => {
          console.error('Subscription error details:', {
            error,
            message: error instanceof Error ? error.message : String(error),
            raw: JSON.stringify(error, null, 2)
          });

          let errorMessage = 'Subscription error occurred';
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'object' && error !== null) {
            const graphqlError = (error as any)?.message ||
                               (error as any)?.errors?.[0]?.message ||
                               JSON.stringify(error);
            errorMessage = graphqlError;
          } else {
            errorMessage = String(error);
          }

          onError?.(new Error(errorMessage));
        },
        complete: () => {
          console.log('Subscription completed');
          onComplete?.();
        },
      }
    );
  }
}

const hasuraConfig: HasuraClientConfig = {
  url: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT_WSS as string,
};

export const hasuraClient = HasuraSubscriptionClient.getInstance(hasuraConfig);

export function subscribeToHasura(options: SubscriptionOptions) {
  return hasuraClient.subscribe(options);
}
