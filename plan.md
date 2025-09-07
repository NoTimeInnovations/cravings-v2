# Business Onboarding Page Implementation Plan

## Overview
The onboarding page will be a multi-step form that allows business owners to register their business and upload their menu items. The page will be accessible at `/onboard` and will consist of three main parts:

1. **Registration Details**: Business information and account creation
2. **Menu/Catalog Upload**: Upload up to 5 products with name, price, and image
3. **Preview**: Preview of the business profile before final submission

## Implemented Components

### 1. Page Structure
- ✅ Created a new page at `src/app/onboard/page.tsx`
- ✅ Implemented a multi-step form with a stepper UI to show progress
- ✅ Used client-side state management to handle form data across steps
- ✅ Implemented form validation for each step
- ✅ Created a layout file at `src/app/onboard/layout.tsx`

### 2. Components Structure

#### Main Components
1. ✅ `OnboardingPage`: The main container component with stepper UI
2. ✅ `RegistrationForm`: Step 1 - Business registration details
3. ✅ `MenuUploadForm`: Step 2 - Menu item upload interface
4. ✅ `BusinessPreview`: Step 3 - Preview of the business profile

### 3. Data Model

#### Business Registration Data
```typescript
interface BusinessRegistrationData {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  area: string;
  location: string; // Google Maps URL
  category: string; // e.g., "restaurant", "cafe", etc.
  upiId: string; // For payments
}
```

#### Menu Item Data
```typescript
interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string; // URL to the uploaded image
  category?: string;
}
```

### 4. Implementation Details

#### Registration Form
- ✅ Form fields for business details with validation
- ✅ Integration with location store for area selection
- ✅ Google Maps location input with button to open Google Maps
- ✅ Password and confirm password validation

#### Menu Upload Form
- ✅ Form for adding menu items with name, price, description, and image
- ✅ Image upload functionality using AWS S3
- ✅ List view of added menu items with option to remove
- ✅ Limit of 5 menu items with validation

#### Preview Page
- ✅ Display of business details
- ✅ Display of menu items with images
- ✅ Confirmation section before final submission
- ✅ Submit button with loading state

#### Submission Process
- ✅ Create user account with Firebase Authentication
- ✅ Store business details in Firestore
- ✅ Store menu items in Firestore subcollection
- ✅ Handle success/error states and redirect to admin dashboard

## API and Storage Integration

### Authentication
- ✅ Firebase Authentication for user creation
- ✅ Store user role as "hotel" for business accounts

### Data Storage
- ✅ Store business details in Firestore "users" collection
- ✅ Store menu items in a subcollection
- ✅ Set initial account status as "pending" for review

### Image Storage
- ✅ AWS S3 for image uploads
- ✅ Store image URLs in Firestore with menu items

## UI/UX Features

- ✅ Mobile-responsive design for all steps
- ✅ Clear validation messages and error handling
- ✅ Loading states for async operations
- ✅ Success/failure notifications using toast
- ✅ Smooth navigation between steps

## Future Enhancements

1. **Email Verification**: Add email verification step after registration
2. **More Business Details**: Add fields for opening hours, description, etc.
3. **Bulk Menu Upload**: Allow uploading multiple menu items at once via CSV
4. **Enhanced Image Management**: Add image cropping and editing tools
5. **Business Profile Customization**: Allow customizing colors, fonts, etc.
6. **Preview Mobile View**: Show how the business will look on mobile devices
7. **Social Media Integration**: Add fields for social media links
8. **Advanced Menu Organization**: Add categories and sections to menu items
9. **Approval Workflow**: Add admin interface for approving new businesses
10. **Analytics Dashboard**: Show business performance metrics after approval 