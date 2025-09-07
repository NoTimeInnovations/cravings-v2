"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Step components will be imported here
import RegistrationForm from "./components/RegistrationForm";
import MenuUploadForm from "./components/MenuUploadForm";
import BusinessPreview from "./components/BusinessPreview";

// Define localStorage? keys
const LS_BUSINESS_DATA = "cravings_onboard_business_data";
const LS_CURRENT_STEP = "cravings_onboard_current_step";
const LS_MENU_ITEMS = "cravings_onboard_menu_items";

// Define the steps for the onboarding process
const steps = [
  { id: 1, name: "Registration Details" },
  { id: 2, name: "Menu Upload" },
  { id: 3, name: "Preview" },
];

// Define the business registration data interface
export interface BusinessRegistrationData {
  businessName: string;
  ownerName: string;
  email?: string; // Made optional
  phone: string;
  password?: string; // Made optional
  confirmPassword?: string; // Made optional
  area: string;
  district: string;
  country: string;
  location: string; // Google Maps URL
  category: string; // e.g., "restaurant", "cafe", etc.
  upiId: string; // For payments
  logo: string; // Added logo field
}

// Define the menu item interface
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string; // URL to the uploaded image
  category?: string;
  mustTry?: boolean; // Added mustTry field
}

export default function OnboardingPage() {
  const router = useRouter();
  
  // State for tracking the current step
  const [currentStep, setCurrentStep] = useState(1);
  
  // State for storing form data
  const [businessData, setBusinessData] = useState<BusinessRegistrationData>({
    businessName: "",
    ownerName: "",
    email: "", // Keep but optional
    phone: "",
    password: "", // Keep but optional
    confirmPassword: "",
    area: "",
    district: "",
    country: "India", // Default country
    location: "",
    category: "restaurant",
    upiId: "",
    logo: "",
  });
  
  // State for storing menu items
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  // State for tracking loading state during submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State for tracking errors
  const [error, setError] = useState<string | null>(null);

  // Load data from localStorage? on component mount
  useEffect(() => {
    try {
      // Load business data
      const storedBusinessData = localStorage?.getItem(LS_BUSINESS_DATA);
      if (storedBusinessData) {
        const parsedData = JSON.parse(storedBusinessData);
        setBusinessData(parsedData);
      }
      
      // Load menu items
      const storedMenuItems = localStorage?.getItem(LS_MENU_ITEMS);
      if (storedMenuItems) {
        const parsedMenuItems = JSON.parse(storedMenuItems);
        setMenuItems(parsedMenuItems);
      }
      
      // Load current step
      const storedStep = localStorage?.getItem(LS_CURRENT_STEP);
      if (storedStep) {
        const step = parseInt(storedStep);
        if (step >= 1 && step <= steps.length) {
          setCurrentStep(step);
        }
      }
    } catch (err) {
      console.error("Error loading data from localStorage?:", err);
    }
  }, []);
  
  // Save business data to localStorage? whenever it changes
  useEffect(() => {
    try {
      localStorage?.setItem(LS_BUSINESS_DATA, JSON.stringify(businessData));
    } catch (err) {
      console.error("Error saving business data to localStorage?:", err);
    }
  }, [businessData]);
  
  // Save menu items to localStorage? whenever they change
  useEffect(() => {
    try {
      // Create a version with optimized image storage
      const storableMenuItems = menuItems.map(item => {
        // If the item has a large base64 image, optimize it
        if (item.image && item.image.startsWith('data:image') && item.image.length > 50000) {
          // Create a simplified version for storage
          return {
            ...item,
            image: `image_ref_${item.id}` // Store just a reference
          };
        }
        return item;
      });
      
      localStorage?.setItem(LS_MENU_ITEMS, JSON.stringify(storableMenuItems));
    } catch (err) {
      console.error("Error saving menu items to localStorage?:", err);
      toast.error("Your menu data exceeded the storage limit. Some images might not persist between sessions.", {
        duration: 5000,
      });
    }
  }, [menuItems]);
  
  // Save current step to localStorage? whenever it changes
  useEffect(() => {
    try {
      localStorage?.setItem(LS_CURRENT_STEP, currentStep.toString());
    } catch (err) {
      console.error("Error saving current step to localStorage?:", err);
    }
  }, [currentStep]);

  // Handle next step
  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle final submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create a unique identifier for this business since we don't have email/password
      const uniqueId = `${businessData.phone.replace(/\D/g, '')}_${Date.now()}`;
      
      // Create business document in Firestore - using a different method without authentication
      await setDoc(doc(db, "businesses", uniqueId), {
        businessName: businessData.businessName,
        ownerName: businessData.ownerName,
        phone: businessData.phone,
        area: businessData.area,
        district: businessData.district,
        country: businessData.country,
        location: businessData.location,
        category: businessData.category,
        upiId: businessData.upiId,
        logo: businessData.logo,
        role: "hotel", // Set role as hotel/business
        accountStatus: "pending", // Set initial status as pending for review
        createdAt: new Date().toISOString(),
      });
      
      // Store menu items in the same document or a subcollection
      const menuItemsCollection = doc(db, "businesses", uniqueId, "menu", "items");
      await setDoc(menuItemsCollection, {
        items: menuItems.map(item => ({
          name: item.name,
          price: item.price,
          description: item.description,
          image: item.image,
          mustTry: item.mustTry,
          category: businessData.category,
        }))
      });
      
      // Show success message
      toast.success("Business registered successfully! Your details have been saved for marketing purposes.");
      
      // Redirect to a thank you page or the homepage
      router.push("/thank-you");
      
    } catch (error) {
      console.error("Error submitting data:", error);
      setError(
        error instanceof Error 
          ? error.message 
          : "An unexpected error occurred. Please try again."
      );
      toast.error("Failed to save business information. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`container mx-auto py-8 px-4 ${currentStep === 2 ? 'max-w-7xl' : 'max-w-4xl'}`}>
      <h1 className="text-3xl font-bold text-center mb-8">Business Onboarding</h1>
      
      {/* Stepper */}
      <div className="mb-8">
        <ol className="flex items-center w-full">
          {steps.map((step, index) => (
            <li 
              key={step.id} 
              className={`flex items-center ${
                index < steps.length - 1 
                  ? "w-full" 
                  : "flex-1"
              }`}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep > step.id 
                  ? "bg-green-500" 
                  : currentStep === step.id 
                    ? "bg-blue-600" 
                    : "bg-gray-200"
              } shrink-0`}>
                {currentStep > step.id ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <span className={`text-sm font-medium ${
                    currentStep === step.id ? "text-white" : "text-gray-500"
                  }`}>
                    {step.id}
                  </span>
                )}
              </div>
              <span className={`ms-3 text-sm font-medium ${
                currentStep === step.id ? "text-blue-600" : "text-gray-500"
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 ms-3 me-3 ${
                  currentStep > step.id ? "bg-green-500" : "bg-gray-200"
                }`}></div>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Main content */}
      <Card className={`${currentStep === 2 ? 'p-4' : 'p-6'}`}>
        {currentStep === 1 && (
          <RegistrationForm 
            businessData={businessData}
            setBusinessData={setBusinessData}
            onNext={handleNext}
          />
        )}
        
        {currentStep === 2 && (
          <MenuUploadForm 
            menuItems={menuItems}
            setMenuItems={setMenuItems}
            onNext={handleNext}
            onPrevious={handlePrevious}
            businessData={businessData}
          />
        )}
        
        {currentStep === 3 && (
          <BusinessPreview 
            businessData={businessData}
            menuItems={menuItems}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </Card>
    </div>
  );
} 