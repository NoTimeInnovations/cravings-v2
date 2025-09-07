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
  adminSecret?: string;
  headers?: Record<string, string>;
}

class HasuraSubscriptionClient {
  private client: Client;
  private static instance: HasuraSubscriptionClient;

  private constructor(config: HasuraClientConfig) {
    this.client = createClient({
      url: config.url,
      connectionParams: () => ({
        headers: {
          ...(config.adminSecret && { 'x-hasura-admin-secret': config.adminSecret }),
          ...config.headers,
          'Content-Type': 'application/json',
        },
      }),
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
          
          // Try to extract a meaningful error message
          let errorMessage = 'Subscription error occurred';
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'object' && error !== null) {
            // Try to extract message from GraphQL error
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

// Initialize with your Hasura configuration
const hasuraConfig: HasuraClientConfig = {
  url: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT_WSS as string,
  adminSecret: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET as string,
};

export const hasuraClient = HasuraSubscriptionClient.getInstance(hasuraConfig);

/**
 * Subscribe to Hasura GraphQL subscriptions
 * @param options Subscription options
 * @returns Unsubscribe function
 */
export function subscribeToHasura(options: SubscriptionOptions) {
  return hasuraClient.subscribe(options);
}