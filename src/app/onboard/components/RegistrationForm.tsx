"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLocationStore } from "@/store/locationStore";
import { BusinessRegistrationData } from "../page";
import Image from "next/image";

// Define the validation schema
const registrationSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  countryCode: z.string().optional(),
  isIndia: z.boolean().default(true),
  country: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  upiId: z.string().optional(),
});

interface RegistrationFormProps {
  businessData: BusinessRegistrationData;
  setBusinessData: React.Dispatch<React.SetStateAction<BusinessRegistrationData>>;
  onNext: () => void;
}

// List of countries
const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
  "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
  "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// List of Indian states
const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// Country codes for phone numbers
const countryCodes = [
  { country: "Afghanistan", code: "+93" },
  { country: "Albania", code: "+355" },
  { country: "Algeria", code: "+213" },
  { country: "Andorra", code: "+376" },
  { country: "Angola", code: "+244" },
  { country: "Antigua and Barbuda", code: "+1-268" },
  { country: "Argentina", code: "+54" },
  { country: "Armenia", code: "+374" },
  { country: "Australia", code: "+61" },
  { country: "Austria", code: "+43" },
  { country: "Azerbaijan", code: "+994" },
  { country: "Bahamas", code: "+1-242" },
  { country: "Bahrain", code: "+973" },
  { country: "Bangladesh", code: "+880" },
  { country: "Barbados", code: "+1-246" },
  { country: "Belarus", code: "+375" },
  { country: "Belgium", code: "+32" },
  { country: "Belize", code: "+501" },
  { country: "Benin", code: "+229" },
  { country: "Bhutan", code: "+975" },
  { country: "Bolivia", code: "+591" },
  { country: "Bosnia and Herzegovina", code: "+387" },
  { country: "Botswana", code: "+267" },
  { country: "Brazil", code: "+55" },
  { country: "Brunei", code: "+673" },
  { country: "Bulgaria", code: "+359" },
  { country: "Burkina Faso", code: "+226" },
  { country: "Burundi", code: "+257" },
  { country: "Cambodia", code: "+855" },
  { country: "Cameroon", code: "+237" },
  { country: "Canada", code: "+1" },
  { country: "Cape Verde", code: "+238" },
  { country: "Central African Republic", code: "+236" },
  { country: "Chad", code: "+235" },
  { country: "Chile", code: "+56" },
  { country: "China", code: "+86" },
  { country: "Colombia", code: "+57" },
  { country: "Comoros", code: "+269" },
  { country: "Congo", code: "+242" },
  { country: "Costa Rica", code: "+506" },
  { country: "Croatia", code: "+385" },
  { country: "Cuba", code: "+53" },
  { country: "Cyprus", code: "+357" },
  { country: "Czech Republic", code: "+420" },
  { country: "Denmark", code: "+45" },
  { country: "Djibouti", code: "+253" },
  { country: "Dominica", code: "+1-767" },
  { country: "Dominican Republic", code: "+1-809" },
  { country: "Ecuador", code: "+593" },
  { country: "Egypt", code: "+20" },
  { country: "El Salvador", code: "+503" },
  { country: "Equatorial Guinea", code: "+240" },
  { country: "Eritrea", code: "+291" },
  { country: "Estonia", code: "+372" },
  { country: "Ethiopia", code: "+251" },
  { country: "Fiji", code: "+679" },
  { country: "Finland", code: "+358" },
  { country: "France", code: "+33" },
  { country: "Gabon", code: "+241" },
  { country: "Gambia", code: "+220" },
  { country: "Georgia", code: "+995" },
  { country: "Germany", code: "+49" },
  { country: "Ghana", code: "+233" },
  { country: "Greece", code: "+30" },
  { country: "Grenada", code: "+1-473" },
  { country: "Guatemala", code: "+502" },
  { country: "Guinea", code: "+224" },
  { country: "Guinea-Bissau", code: "+245" },
  { country: "Guyana", code: "+592" },
  { country: "Haiti", code: "+509" },
  { country: "Honduras", code: "+504" },
  { country: "Hungary", code: "+36" },
  { country: "Iceland", code: "+354" },
  { country: "India", code: "+91" },
  { country: "Indonesia", code: "+62" },
  { country: "Iran", code: "+98" },
  { country: "Iraq", code: "+964" },
  { country: "Ireland", code: "+353" },
  { country: "Israel", code: "+972" },
  { country: "Italy", code: "+39" },
  { country: "Jamaica", code: "+1-876" },
  { country: "Japan", code: "+81" },
  { country: "Jordan", code: "+962" },
  { country: "Kazakhstan", code: "+7" },
  { country: "Kenya", code: "+254" },
  { country: "Kiribati", code: "+686" },
  { country: "Korea, North", code: "+850" },
  { country: "Korea, South", code: "+82" },
  { country: "Kuwait", code: "+965" },
  { country: "Kyrgyzstan", code: "+996" },
  { country: "Laos", code: "+856" },
  { country: "Latvia", code: "+371" },
  { country: "Lebanon", code: "+961" },
  { country: "Lesotho", code: "+266" },
  { country: "Liberia", code: "+231" },
  { country: "Libya", code: "+218" },
  { country: "Liechtenstein", code: "+423" },
  { country: "Lithuania", code: "+370" },
  { country: "Luxembourg", code: "+352" },
  { country: "Madagascar", code: "+261" },
  { country: "Malawi", code: "+265" },
  { country: "Malaysia", code: "+60" },
  { country: "Maldives", code: "+960" },
  { country: "Mali", code: "+223" },
  { country: "Malta", code: "+356" },
  { country: "Marshall Islands", code: "+692" },
  { country: "Mauritania", code: "+222" },
  { country: "Mauritius", code: "+230" },
  { country: "Mexico", code: "+52" },
  { country: "Micronesia", code: "+691" },
  { country: "Moldova", code: "+373" },
  { country: "Monaco", code: "+377" },
  { country: "Mongolia", code: "+976" },
  { country: "Montenegro", code: "+382" },
  { country: "Morocco", code: "+212" },
  { country: "Mozambique", code: "+258" },
  { country: "Myanmar", code: "+95" },
  { country: "Namibia", code: "+264" },
  { country: "Nauru", code: "+674" },
  { country: "Nepal", code: "+977" },
  { country: "Netherlands", code: "+31" },
  { country: "New Zealand", code: "+64" },
  { country: "Nicaragua", code: "+505" },
  { country: "Niger", code: "+227" },
  { country: "Nigeria", code: "+234" },
  { country: "Norway", code: "+47" },
  { country: "Oman", code: "+968" },
  { country: "Pakistan", code: "+92" },
  { country: "Palau", code: "+680" },
  { country: "Panama", code: "+507" },
  { country: "Papua New Guinea", code: "+675" },
  { country: "Paraguay", code: "+595" },
  { country: "Peru", code: "+51" },
  { country: "Philippines", code: "+63" },
  { country: "Poland", code: "+48" },
  { country: "Portugal", code: "+351" },
  { country: "Qatar", code: "+974" },
  { country: "Romania", code: "+40" },
  { country: "Russia", code: "+7" },
  { country: "Rwanda", code: "+250" },
  { country: "Saint Kitts and Nevis", code: "+1-869" },
  { country: "Saint Lucia", code: "+1-758" },
  { country: "Saint Vincent and the Grenadines", code: "+1-784" },
  { country: "Samoa", code: "+685" },
  { country: "San Marino", code: "+378" },
  { country: "Sao Tome and Principe", code: "+239" },
  { country: "Saudi Arabia", code: "+966" },
  { country: "Senegal", code: "+221" },
  { country: "Serbia", code: "+381" },
  { country: "Seychelles", code: "+248" },
  { country: "Sierra Leone", code: "+232" },
  { country: "Singapore", code: "+65" },
  { country: "Slovakia", code: "+421" },
  { country: "Slovenia", code: "+386" },
  { country: "Solomon Islands", code: "+677" },
  { country: "Somalia", code: "+252" },
  { country: "South Africa", code: "+27" },
  { country: "South Sudan", code: "+211" },
  { country: "Spain", code: "+34" },
  { country: "Sri Lanka", code: "+94" },
  { country: "Sudan", code: "+249" },
  { country: "Suriname", code: "+597" },
  { country: "Sweden", code: "+46" },
  { country: "Switzerland", code: "+41" },
  { country: "Syria", code: "+963" },
  { country: "Taiwan", code: "+886" },
  { country: "Tajikistan", code: "+992" },
  { country: "Tanzania", code: "+255" },
  { country: "Thailand", code: "+66" },
  { country: "Timor-Leste", code: "+670" },
  { country: "Togo", code: "+228" },
  { country: "Tonga", code: "+676" },
  { country: "Trinidad and Tobago", code: "+1-868" },
  { country: "Tunisia", code: "+216" },
  { country: "Turkey", code: "+90" },
  { country: "Turkmenistan", code: "+993" },
  { country: "Tuvalu", code: "+688" },
  { country: "Uganda", code: "+256" },
  { country: "Ukraine", code: "+380" },
  { country: "United Arab Emirates", code: "+971" },
  { country: "United Kingdom", code: "+44" },
  { country: "United States", code: "+1" },
  { country: "Uruguay", code: "+598" },
  { country: "Uzbekistan", code: "+998" },
  { country: "Vanuatu", code: "+678" },
  { country: "Vatican City", code: "+39-06" },
  { country: "Venezuela", code: "+58" },
  { country: "Vietnam", code: "+84" },
  { country: "Yemen", code: "+967" },
  { country: "Zambia", code: "+260" },
  { country: "Zimbabwe", code: "+263" }
];

export default function RegistrationForm({
  businessData,
  setBusinessData,
  onNext,
}: RegistrationFormProps) {
  const { locations } = useLocationStore();
  const [formError, setFormError] = useState<string | null>(null);
  const [isIndia, setIsIndia] = useState(true);
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const [selectedCountryCode, setSelectedCountryCode] = useState("+91");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<any>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      businessName: businessData.businessName,
      phone: businessData.phone,
      countryCode: "+91",
      isIndia: true,
      state: businessData.area,
      district: businessData.district,
      location: businessData.location,
      upiId: businessData.upiId,
    },
  });

  // Open Google Maps in a new tab
  const openGoogleMaps = () => {
    window.open("https://www.google.com/maps", "_blank");
  };

  const onSubmit = (data: any) => {
  /* eslint-enable @typescript-eslint/no-explicit-any */
    try {
      // Prepare the data for the next step
      const updatedData = {
        ...businessData,
        businessName: data.businessName,
        phone: isIndia ? data.phone : `${data.countryCode} ${data.phone}`,
        area: isIndia ? data.state : "",
        district: isIndia ? data.district : "",
        country: !isIndia ? data.country : "India",
        location: data.location,
        upiId: data.upiId || "",
      };

      setBusinessData(updatedData);
      onNext();
    } catch (error) {
      setFormError("An error occurred. Please try again.");
      console.error("Form submission error:", error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setBusinessData({
        ...businessData,
        logo: result
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Register as Partner</h2>

      {formError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="logo">Business Logo</Label>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 h-[150px] relative">
            {logoPreview ? (
              <div className="relative w-24 h-24">
                <Image
                  src={logoPreview}
                  alt="Business Logo"
                  width={96}
                  height={96}
                  className="w-full h-full object-contain rounded-full border border-gray-200"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <span className="text-2xl">🏪</span>
                </div>
                <p className="text-sm">Upload your business logo</p>
              </div>
            )}
            <input
              type="file"
              id="logo"
              accept="image/*"
              className="absolute inset-0 w-0 h-0 opacity-0"
              onChange={handleLogoChange}
            />
            <label 
              htmlFor="logo" 
              className="absolute inset-0 cursor-pointer"
              aria-label="Upload logo"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            placeholder="Enter your business name"
            {...register("businessName")}
          />
          {errors.businessName && (
            <p className="text-sm text-red-500">{errors.businessName.message as string}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="isIndia">Is your business located in India?</Label>
          <Switch 
            id="isIndia"
            checked={isIndia}
            onCheckedChange={(checked) => {
              setIsIndia(checked);
              setValue("isIndia", checked);
              if (checked) {
                setSelectedCountryCode("+91");
                setValue("countryCode", "+91");
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          {!isIndia ? (
            <div className="flex gap-2">
              <Select 
                onValueChange={(value) => {
                  setSelectedCountryCode(value);
                  setValue("countryCode", value);
                }}
                defaultValue="+91"
              >
                <SelectTrigger id="countryCode" className="w-[110px]">
                  <SelectValue placeholder={selectedCountryCode} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {countryCodes.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.code} ({item.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                className="flex-1"
                {...register("phone")}
              />
            </div>
          ) : (
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              {...register("phone")}
            />
          )}
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message as string}</p>
          )}
        </div>

        {isIndia ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select 
                onValueChange={(value) => {
                  setValue("state", value);
                  setSelectedState(value);
                }}
                defaultValue={businessData.area}
              >
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent>
                  {indianStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-sm text-red-500">{errors.state.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Select 
                onValueChange={(value) => setValue("district", value)}
                defaultValue={businessData.district}
              >
                <SelectTrigger id="district">
                  <SelectValue placeholder="Select your district" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location: string) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.district && (
                <p className="text-sm text-red-500">{errors.district.message as string}</p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select 
              onValueChange={(value) => {
                setValue("country", value);
                // Find and set the country code when country changes
                const countryData = countryCodes.find(c => c.country === value);
                if (countryData) {
                  setSelectedCountryCode(countryData.code);
                  setValue("countryCode", countryData.code);
                }
              }}
              defaultValue={businessData.country}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country && (
              <p className="text-sm text-red-500">{errors.country.message as string}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="location">Google Map Location</Label>
          <div className="relative">
            <Textarea
              id="location"
              placeholder="Paste your gmap location"
              className="min-h-[80px] pr-10"
              {...register("location")}
            />
            <Button
              type="button"
              className="absolute right-2 top-2"
              variant="ghost"
              size="icon"
              onClick={openGoogleMaps}
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
          {errors.location && (
            <p className="text-sm text-red-500">{errors.location.message as string}</p>
          )}
        </div>

        <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">
          Continue
        </Button>
      </form>
    </div>
  );
} 