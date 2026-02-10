# Dynamic Branding & White-Labeling

This document outlines the implementation of dynamic branding for the application, allowing it to adapt its appearance and content based on the accessed domain (e.g., `cravings.live` vs `menuthere.com`).

## 1. Domain Configuration

The central configuration file is located at `src/data/domains.json`. It defines the branding assets and text for each supported domain.

**Structure:**
```json
{
    "cravings.live": {
        "name": "Cravings",
        "title": "Cravings",
        "description": "...",
        // Default logo/icon logic applies if not specified
    },
    "menuthere.com": {
        "name": "MenuThere",
        "title": "MenuThere",
        "description": "...",
        "logo": "/menuthere-logo.png",
        "icon": "/menuthere-logo.png",
        "logowhite": "/menuthere-logo.png",
        "ogImage": "/menuthere-logo.png"
    }
}
```

## 2. Utilities

### `src/lib/domain-utils.ts`
- **`getDomainConfig(host)`**: Returns the configuration object for the given host.
- **`DomainConfig` Interface**: use this to type-check domain properties.

### `src/providers/DomainProvider.tsx`
- **`DomainProvider`**: A React Context Provider that supplies the `DomainConfig` to the entire component tree.
- **`useDomain()`**: A custom hook to access `DomainConfig` in any Client Component.

## 3. Implementation Details

### Server Components (Pages, Layouts)
- Use `headers()` to get the `host`.
- Call `getDomainConfig(host)` to retrieve branding.
- Pass `config` to `DomainProvider` in `RootLayout`.
- Use `config` for `metadata` (title, description, icons, openGraph).

### Client Components
- Use `const { name, logo, icon, ... } = useDomain()` to access branding data.
- **Navbar**: Displays dynamic `appName` and `logo`.
- **Footer**: Displays dynamic `appName`.
- **Modals**: `RateUsModal`, `PwaInstallPrompt`, `PlaceOrderModal` use dynamic text and icons.
- **Explore/Offers**: Buttons and share messages use dynamic `appName` and generated links.

### Emails
- **`src/lib/email.ts`**: `getEmailConfig` determines the sender identity ("Cravings" vs "MenuThere") and API keys based on the host.
- **`src/backend_auto_image_gen.ts`**: Background jobs accept `host` to send branded emails.

### API Routes
- **`api/auto-gen-image`**: Passes the request host to background jobs to ensure correct branding context.

## 4. Assets

- Ensure assets referenced in `domains.json` (e.g., `/menuthere-logo.png`) exist in the `public/` directory.

## 5. Adding a New Domain

1.  Add the domain key to `src/data/domains.json`.
2.  Define `name`, `title`, `description`.
3.  Add logo/icon files to `public/`.
4.  reference them in `domains.json`.
5.  (Optional) Add specific environment variables (like `RESEND_API_KEY_NEWDOMAIN`) if separate email infrastructure is needed, and update `src/lib/email.ts`.
