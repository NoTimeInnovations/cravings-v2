# Business Onboarding Feature

## Overview

The Business Onboarding feature allows restaurant and food business owners to register their business on the Cravings platform. The onboarding process is designed as a multi-step form that guides users through:

1. **Business Registration**: Collecting business details and creating an account
2. **Menu Upload**: Adding up to 5 menu items with images
3. **Preview**: Reviewing the business profile before submission

## Implementation Details

### Technologies Used

- **Next.js 15**: For the frontend framework
- **React Hook Form + Zod**: For form handling and validation
- **Firebase Authentication**: For user account creation
- **Firestore**: For storing business and menu data
- **AWS S3**: For image storage
- **Tailwind CSS + shadcn/ui**: For UI components and styling

### File Structure

```
src/app/onboard/
├── page.tsx              # Main onboarding page with stepper
├── layout.tsx            # Layout wrapper for the onboarding page
└── components/
    ├── RegistrationForm.tsx  # Step 1: Business registration form
    ├── MenuUploadForm.tsx    # Step 2: Menu item upload form
    └── BusinessPreview.tsx   # Step 3: Preview and submission
```

### Key Features

- **Multi-step Form**: Intuitive step-by-step process with progress indicator
- **Form Validation**: Comprehensive validation for all input fields
- **Image Upload**: Direct upload to AWS S3 for menu item images
- **Mobile Responsive**: Fully responsive design for all device sizes
- **Error Handling**: Clear error messages and recovery options
- **Preview**: Visual preview of the business profile before submission

## How It Works

1. User navigates to `/onboard`
2. User fills out business registration details
3. User adds menu items (up to 5) with images
4. User reviews the business profile in the preview step
5. On submission:
   - A new user account is created in Firebase Authentication
   - Business details are stored in Firestore
   - Menu items are stored in a subcollection
   - User is redirected to the admin dashboard

## Business Data Model

```typescript
// Business Registration Data
interface BusinessRegistrationData {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  area: string;
  location: string; // Google Maps URL
  category: string; // e.g., "restaurant", "cafe", etc.
  upiId: string; // For payments
}

// Menu Item Data
interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string; // URL to the uploaded image
  category?: string;
}
```

## Firestore Structure

```
users/
└── [userId]/
    ├── businessName: string
    ├── ownerName: string
    ├── email: string
    ├── phone: string
    ├── area: string
    ├── location: string
    ├── category: string
    ├── upiId: string
    ├── role: "hotel"
    ├── accountStatus: "pending"
    ├── createdAt: timestamp
    └── menu/
        └── items/
            └── items: array of MenuItem
```

## Future Enhancements

1. **Email Verification**: Add email verification step after registration
2. **More Business Details**: Add fields for opening hours, description, etc.
3. **Bulk Menu Upload**: Allow uploading multiple menu items at once via CSV
4. **Enhanced Image Management**: Add image cropping and editing tools
5. **Business Profile Customization**: Allow customizing colors, fonts, etc.

## Usage

To access the onboarding page, navigate to:

```
/onboard
```

After successful registration, business owners will be redirected to the admin dashboard where they can manage their business profile and menu items. 