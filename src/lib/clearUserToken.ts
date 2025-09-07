import { fetchFromHasura } from "./hasuraClient";

export async function clearUserToken(token: string): Promise<void> {
    try {
        await fetchFromHasura(`
                mutation ClearUserToken($token: String!) {
                        delete_device_tokens(
                                where: { device_token: { _eq: $token } }
                        ) {
                                affected_rows
                        }
                }
                `,
            { token }
        );

        console.log(`Token cleared successfully:`, token);
    } catch (error) {
        console.error(`Failed to clear token:`, error);
    }
}
