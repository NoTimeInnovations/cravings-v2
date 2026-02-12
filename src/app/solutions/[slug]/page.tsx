import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getDomainConfig } from "@/lib/domain-utils";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQAccordion } from "@/components/FAQAccordion";
import {
  Utensils, Coffee, Cake, ChefHat, Truck, Building2, Wine, PartyPopper,
  ArrowRight, QrCode, Globe, TrendingUp, Clock, CheckCircle2, Star,
  Smartphone, CreditCard, BarChart3, Zap, Shield, Users, MapPin,
  Printer, RefreshCw, Bell, Palette
} from "lucide-react";

// Helper function to replace app name in data
function replaceAppNameInObject(obj: any, appName: string): any {
  if (typeof obj === "string") {
    // Replace MenuThere placeholder and "Cravings" text (carefully)
    // Avoid replacing URLs that might contain "cravings" (e.g. calendly/cravings, image paths /images/solutions/...)
    // Simple heuristic: don't replace if it looks like a path/url
    // Actually, image paths are strings too.
    if (obj.includes('/') || obj.includes('http')) {
      return obj.replace(/\{appName\}/g, appName); // Only replace explicit placeholder in URLs
    }

    let text = obj.replace(/\{appName\}/g, appName);
    if (appName !== "Cravings") {
      text = text.replace(/\bCravings\b/g, appName);
    }
    return text;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => replaceAppNameInObject(item, appName));
  }
  if (typeof obj === "object" && obj !== null) {
    const newObj: any = {};
    for (const key in obj) {
      if (key === "icon") {
        newObj[key] = obj[key];
      } else {
        newObj[key] = replaceAppNameInObject(obj[key], appName);
      }
    }
    return newObj;
  }
  return obj;
}

// Solution data with comprehensive SEO content
const SOLUTIONS_DATA: Record<string, SolutionData> = {
  restaurants: {
    slug: "restaurants",
    title: "Digital Menus for Restaurants",
    metaTitle: "Restaurant Digital Menu Solution | QR Code Menus | MenuThere",
    metaDescription: "Transform your restaurant with smart QR code menus. Real-time updates, stunning visuals, Google Business sync. Reduce printing costs by 90%. Trusted by 5000+ restaurants across India.",
    keywords: "restaurant digital menu, QR code menu restaurant, contactless dining, restaurant technology, menu management system, restaurant POS integration",
    icon: Utensils,
    color: "bg-[#e65a22]",
    heroImage: "/images/solutions/restaurant-hero.jpg",

    headline: "Smart Digital Menus for Modern Restaurants",
    subheadline: "Elevate your dining experience with beautiful, interactive menus that update in real-time",

    introduction: `
      In today's competitive restaurant industry, first impressions matter more than ever. Your menu is often the first thing customers interact with - it sets the tone for their entire dining experience. Traditional paper menus are costly to print, difficult to update, and can't showcase your dishes in their best light.

      MenuThere transforms your restaurant menu into a powerful digital experience. With our smart QR code menus, customers can browse your offerings on their smartphones, complete with stunning food photography, detailed descriptions, allergen information, and real-time pricing. No app downloads required - just scan and explore.
    `,

    benefits: [
      {
        icon: Clock,
        title: "Real-Time Menu Updates",
        description: "Change prices, add daily specials, or mark items as sold out instantly. No more crossing out items or reprinting menus. Your digital menu is always accurate and up-to-date."
      },
      {
        icon: Printer,
        title: "Zero Printing Costs",
        description: "Eliminate recurring printing expenses. A single QR code replaces hundreds of paper menus. Restaurants save an average of ₹15,000-50,000 annually on printing costs alone."
      },
      {
        icon: TrendingUp,
        title: "Increase Average Order Value",
        description: "Beautiful food photography and smart upselling suggestions can increase your average order value by 15-25%. Customers order more when they can see what they're getting."
      },
      {
        icon: Globe,
        title: "Google Business Profile Sync",
        description: "Automatically update your Google Business Profile menu whenever you make changes. Improve your local SEO and help customers discover your restaurant on Google Maps."
      },
      {
        icon: BarChart3,
        title: "Menu Analytics",
        description: "Understand what items are most viewed, which combinations sell best, and when customers browse your menu. Data-driven insights to optimize your offerings."
      }
    ],

    features: [
      "Unlimited menu items and categories",
      "High-quality food photography display",
      "Allergen and dietary information",
      "Daily specials and limited-time offers",
      "Table ordering integration",
      "POS system compatibility",
      "Custom branding and themes",
      "Google Business Profile sync",
      "Staff training and onboarding",
      "24/7 customer support"
    ],

    useCases: [
      {
        title: "Fine Dining Restaurants",
        description: "Create an elegant, sophisticated menu experience that matches your ambiance. Showcase chef's specials, wine pairings, and tasting menus with beautiful imagery."
      },
      {
        title: "Casual Dining Chains",
        description: "Maintain consistency across multiple locations with centralized menu management. Update all branches simultaneously with a single click."
      },
      {
        title: "Quick Service Restaurants",
        description: "Speed up ordering with clear, visual menus. Reduce order errors and improve kitchen efficiency with accurate digital orders."
      },
      {
        title: "Family Restaurants",
        description: "Create separate kids' menus, combo deals, and family platters. Make ordering easy for groups with shareable digital menus."
      }
    ],

    stats: [
      { value: "500+", label: "Restaurants Trust Us" },
      { value: "2x", label: "Faster Menu Updates" },
      { value: "23%", label: "Increase in Order Value" },
      { value: "< 2 sec", label: "Menu Load Time" }
    ],

    testimonial: {
      quote: "Switching to MenuThere digital menu was the best decision we made. Our customers love the visual menu, and we've seen a 20% increase in orders for items with photos. The Google sync feature is a game-changer for our visibility.",
      author: "Rajesh Kumar",
      role: "Owner, Spice Garden Restaurant",
      location: "Kochi, Kerala"
    },

    faq: [
      {
        question: "How do customers access the digital menu?",
        answer: "Customers simply scan a QR code placed on their table using their smartphone camera. The menu opens instantly in their browser - no app download required. Works on any smartphone with a camera."
      },
      {
        question: "Can I update the menu myself?",
        answer: "Absolutely! Our intuitive dashboard lets you add, edit, or remove items in seconds. Changes go live immediately across all your QR codes. No technical skills needed."
      },
      {
        question: "What if a customer doesn't have a smartphone?",
        answer: "You can still maintain a few printed menus for customers who prefer them. Many restaurants keep 2-3 physical menus as backup while using digital menus as the primary option."
      },
      {
        question: "Can I integrate with my existing POS system?",
        answer: "Yes! MenuThere integrates with popular POS systems including PetPooja, POSist, and others. Orders flow directly to your kitchen display system."
      }
    ],

    relatedSolutions: ["cafes", "bars", "hotels"]
  },

  cafes: {
    slug: "cafes",
    title: "Digital Menus for Cafés & Coffee Shops",
    metaTitle: "Café Digital Menu | Coffee Shop QR Menu Solution | MenuThere",
    metaDescription: "Create stunning digital menus for your café or coffee shop. Showcase specialty brews, seasonal drinks, and pastries with beautiful photography. Real-time updates, Instagram-worthy design.",
    keywords: "café digital menu, coffee shop QR code, café menu design, specialty coffee menu, coffee shop technology, contactless café ordering",
    icon: Coffee,
    color: "bg-[#e65a22]",
    heroImage: "/images/solutions/cafe-hero.jpg",

    headline: "Beautiful Digital Menus for Cafés & Coffee Shops",
    subheadline: "Showcase your specialty brews and artisan treats with menus as beautiful as your coffee",

    introduction: `
      Your café is more than just a place to grab coffee - it's an experience. From the aroma of freshly ground beans to the carefully crafted latte art, every detail matters. Your menu should reflect that same attention to detail and aesthetic sensibility.

      MenuThere helps cafés create Instagram-worthy digital menus that match their unique vibe. Whether you're a minimalist specialty coffee shop, a cozy neighborhood café, or a trendy brunch spot, our platform adapts to your brand. Showcase your single-origin coffees, seasonal specials, and house-made pastries with stunning visuals that make customers want to order (and share on social media).
    `,

    benefits: [
      {
        icon: Palette,
        title: "Instagram-Worthy Design",
        description: "Beautiful, modern menu layouts that reflect your café's aesthetic. Choose from minimalist, cozy, or vibrant themes that match your brand identity perfectly."
      },
      {
        icon: RefreshCw,
        title: "Seasonal Menu Updates",
        description: "Launch your pumpkin spice latte in fall or summer cold brews with a single click. Seasonal menus and limited-time offers are easy to manage and promote."
      },
      {
        icon: Clock,
        title: "Reduce Wait Times",
        description: "Customers can browse and decide what to order while waiting in line. Faster ordering means shorter queues and happier customers during rush hours."
      },
      {
        icon: Star,
        title: "Highlight Specialties",
        description: "Feature your barista's signature drinks, single-origin coffees, and award-winning blends. Draw attention to high-margin items with beautiful showcasing."
      },
      {
        icon: Users,
        title: "Build Community",
        description: "Share the story behind your beans, introduce your baristas, and connect with coffee enthusiasts. Turn first-time visitors into loyal regulars."
      },
      {
        icon: Globe,
        title: "Google Maps Visibility",
        description: "Sync your menu with Google Business Profile so coffee lovers can discover your offerings before they even walk in. Stand out in local searches."
      }
    ],

    features: [
      "Customizable themes and branding",
      "Coffee origin and tasting notes display",
      "Seasonal and featured drinks section",
      "Pastry and food pairing suggestions",
      "Loyalty program integration",
      "Mobile-first responsive design",
      "Social media sharing buttons",
      "Nutritional information display",
      "Allergen warnings for food items",
      "Multi-location management"
    ],

    useCases: [
      {
        title: "Specialty Coffee Shops",
        description: "Educate customers about your single-origin beans, brewing methods, and flavor profiles. Build appreciation for craft coffee with detailed tasting notes."
      },
      {
        title: "Café Bakeries",
        description: "Showcase your fresh-baked croissants, cakes, and pastries alongside your coffee menu. Suggest perfect pairings to increase basket size."
      },
      {
        title: "Co-Working Cafés",
        description: "Display your food and beverage menu alongside workspace packages. Perfect for modern café-office hybrids."
      },
      {
        title: "Franchise Cafés",
        description: "Maintain brand consistency across locations while allowing local specials. Centralized management with localized flexibility."
      }
    ],

    stats: [
      { value: "200+", label: "Cafés Onboarded" },
      { value: "35%", label: "Faster Ordering" },
      { value: "4.8★", label: "Average Rating" },
      { value: "18%", label: "Higher Ticket Size" }
    ],

    testimonial: {
      quote: "Our customers love scanning the QR code and seeing beautiful photos of our drinks. We've noticed people ordering more specialty items because they can actually see what they look like. The seasonal menu feature is perfect for our rotating single-origin offerings.",
      author: "Priya Menon",
      role: "Founder, Third Wave Coffee Co.",
      location: "Bangalore"
    },

    faq: [
      {
        question: "Can I add detailed coffee descriptions and origin information?",
        answer: "Yes! Our platform supports rich descriptions including origin, altitude, processing method, tasting notes, and brewing recommendations. Perfect for educating coffee enthusiasts."
      },
      {
        question: "How do I handle seasonal menu changes?",
        answer: "Create seasonal menus in advance and schedule them to go live on specific dates. Or update manually with just a few clicks. Your QR codes never change."
      },
      {
        question: "Can customers order and pay through the menu?",
        answer: "Yes! Enable table ordering and mobile payments directly through the digital menu. Customers can order, pay, and even split bills from their phones."
      },
      {
        question: "Do you support loyalty programs?",
        answer: "Integrate with popular loyalty platforms or use our built-in stamp card feature. Reward regular customers and encourage repeat visits."
      }
    ],

    relatedSolutions: ["bakeries", "restaurants", "bars"]
  },

  bakeries: {
    slug: "bakeries",
    title: "Digital Menus for Bakeries & Pastry Shops",
    metaTitle: "Bakery Digital Menu | Pastry Shop QR Menu | MenuThere",
    metaDescription: "Showcase your freshly baked goods with stunning digital menus. Mark items as 'Fresh Today' or 'Sold Out' in real-time. Perfect for bakeries, pastry shops, and sweet shops.",
    keywords: "bakery digital menu, pastry shop QR code, cake menu online, bakery POS, sweet shop menu, confectionery menu",
    icon: Cake,
    color: "bg-[#e65a22]",
    heroImage: "/images/solutions/bakery-hero.jpg",

    headline: "Delicious Digital Menus for Bakeries",
    subheadline: "Display your freshly baked goods with mouth-watering visuals that drive sales",

    introduction: `
      Fresh-baked bread, artisan pastries, custom cakes - your bakery creates edible art every single day. But a static menu board or printed flyer can never capture the golden crust of a just-baked croissant or the intricate decorations on a wedding cake.

      MenuThere brings your bakery to life with digital menus that showcase your creations in all their glory. Update availability in real-time (Fresh Out of the Oven! or Sold Out), display custom cake options with photo galleries, and let customers pre-order their favorites. Whether you're a neighborhood bakery, a cake studio, or a patisserie, our platform helps you sell more and waste less.
    `,

    benefits: [
      {
        icon: Clock,
        title: "Real-Time Availability",
        description: "Mark items as 'Fresh Today', 'Just Baked', or 'Sold Out' instantly. Customers always know what's available, reducing disappointment and wasted trips."
      },
      {
        icon: Palette,
        title: "Custom Cake Galleries",
        description: "Showcase your cake portfolio with photo galleries organized by occasion - weddings, birthdays, anniversaries. Let customers browse your designs and request quotes."
      },
      {
        icon: Bell,
        title: "Pre-Order System",
        description: "Accept pre-orders for special items, holiday bakes, and custom cakes. Plan production better and ensure customers get exactly what they want."
      },
      {
        icon: Star,
        title: "Daily Specials Spotlight",
        description: "Highlight your chef's special creation of the day. Feature limited-batch items that create urgency and drive immediate purchases."
      },
      {
        icon: Printer,
        title: "Eliminate Menu Waste",
        description: "No more reprinting menus every time prices change or items sell out. Your digital menu is always current, saving money and reducing environmental impact."
      },
      {
        icon: TrendingUp,
        title: "Increase Impulse Purchases",
        description: "Beautiful photos of your pastries, cakes, and breads trigger cravings (pun intended!). Visual menus consistently drive higher average orders."
      }
    ],

    features: [
      "Real-time stock availability updates",
      "Custom cake request forms",
      "Photo galleries for cake designs",
      "Pre-order and scheduling system",
      "Allergen and ingredient information",
      "Seasonal and holiday menus",
      "Nutritional information display",
      "Bulk order inquiry forms",
      "Customer reviews and ratings",
      "WhatsApp order integration"
    ],

    useCases: [
      {
        title: "Artisan Bakeries",
        description: "Display your sourdough varieties, specialty breads, and fresh pastries. Update availability as batches come out of the oven throughout the day."
      },
      {
        title: "Cake Studios",
        description: "Showcase your custom cake portfolio, accept design inquiries, and manage orders for weddings, birthdays, and special occasions."
      },
      {
        title: "Patisseries",
        description: "Present your French pastries, macarons, and éclairs with the elegance they deserve. Sophisticated design for sophisticated sweets."
      },
      {
        title: "Traditional Sweet Shops",
        description: "Display your mithai, ladoos, and festive specials. Perfect for Indian sweet shops with rotating seasonal offerings."
      }
    ],

    stats: [
      { value: "150+", label: "Bakeries Using Cravings" },
      { value: "40%", label: "Less Food Waste" },
      { value: "28%", label: "More Custom Orders" },
      { value: "95%", label: "Customer Satisfaction" }
    ],

    testimonial: {
      quote: "The 'Fresh Today' feature is brilliant. Customers love knowing exactly what just came out of the oven. Our custom cake inquiries have doubled since we started showcasing our portfolio on the digital menu. It's like having a sales team working 24/7.",
      author: "Maria D'Souza",
      role: "Head Baker, Sweet Cravings Bakery",
      location: "Mumbai"
    },

    faq: [
      {
        question: "How do I update availability when items sell out?",
        answer: "One tap on your phone or dashboard marks an item as sold out. It updates instantly for all customers viewing your menu. Just as easy to mark it available again."
      },
      {
        question: "Can customers place custom cake orders through the menu?",
        answer: "Yes! Add a custom order form where customers can specify occasion, flavor preferences, design inspiration, and delivery date. Receive inquiries directly via WhatsApp or email."
      },
      {
        question: "Do you support pre-orders for special occasions?",
        answer: "Absolutely. Enable pre-ordering for specific items with lead time requirements. Perfect for holiday specials, wedding cakes, or limited-batch items."
      },
      {
        question: "Can I show nutritional and allergen information?",
        answer: "Yes, display detailed ingredient lists, allergen warnings (gluten, nuts, dairy, eggs), and nutritional information for health-conscious customers."
      }
    ],

    relatedSolutions: ["cafes", "catering", "restaurants"]
  },

  "cloud-kitchens": {
    slug: "cloud-kitchens",
    title: "Digital Menu Management for Cloud Kitchens",
    metaTitle: "Cloud Kitchen Menu System | Ghost Kitchen Solution | MenuThere",
    metaDescription: "Manage multiple virtual restaurant brands from one dashboard. Optimize menus across delivery platforms. Built for cloud kitchens, ghost kitchens, and virtual restaurants.",
    keywords: "cloud kitchen menu, ghost kitchen management, virtual restaurant menu, dark kitchen software, delivery kitchen POS, multi-brand menu system",
    icon: ChefHat,
    color: "bg-[#e65a22]",
    heroImage: "/images/solutions/cloud-kitchen-hero.jpg",

    headline: "Powerful Menu Management for Cloud Kitchens",
    subheadline: "Run multiple virtual brands from a single dashboard with enterprise-grade menu tools",

    introduction: `
      Cloud kitchens are revolutionizing the food industry. Without the overhead of dine-in space, you can focus purely on what matters: great food delivered fast. But managing multiple brands, each with its own menu, pricing, and identity, can quickly become overwhelming.

      MenuThere is built for the cloud kitchen model. Manage all your virtual brands - whether it's 2 or 20 - from a single powerful dashboard. Update menus across Swiggy, Zomato, and your own website simultaneously. Track which items perform best, optimize pricing, and launch new brands in minutes instead of weeks.
    `,

    benefits: [
      {
        icon: Users,
        title: "Multi-Brand Management",
        description: "Run multiple virtual restaurant concepts from one account. Each brand gets its own unique menu, branding, and customer experience while you manage everything centrally."
      },
      {
        icon: RefreshCw,
        title: "Cross-Platform Sync",
        description: "Update menus once and sync across all delivery platforms - Swiggy, Zomato, your website, and more. No more updating each platform manually."
      },
      {
        icon: BarChart3,
        title: "Performance Analytics",
        description: "Track which items sell best, identify underperformers, and optimize your menu based on real data. Compare performance across brands and platforms."
      },
      {
        icon: Zap,
        title: "Rapid Brand Launch",
        description: "Launch a new virtual brand in hours, not weeks. Clone existing menus, customize branding, and go live across platforms with minimal effort."
      },
      {
        icon: Clock,
        title: "Dynamic Availability",
        description: "Turn items on or off based on ingredient availability or kitchen capacity. Manage peak hours by temporarily disabling complex items when the kitchen is slammed."
      },
      {
        icon: TrendingUp,
        title: "Menu Optimization",
        description: "A/B test different menu layouts, descriptions, and pricing. Use data to optimize for maximum orders and profitability."
      }
    ],

    features: [
      "Unlimited virtual brands per account",
      "Multi-platform menu synchronization",
      "Brand-specific theming and assets",
      "Centralized inventory tracking",
      "Kitchen capacity management",
      "Peak hour menu adjustments",
      "Cross-brand ingredient optimization",
      "Delivery partner integrations",
      "Performance comparison dashboards",
      "Team roles and permissions"
    ],

    useCases: [
      {
        title: "Multi-Brand Cloud Kitchens",
        description: "Operate 5, 10, or 20 different restaurant brands from a single kitchen. Each brand targets a different cuisine or customer segment."
      },
      {
        title: "Virtual Restaurant Startups",
        description: "Test new restaurant concepts with minimal investment. Launch, iterate, and scale winning ideas while sunsetting underperformers."
      },
      {
        title: "Restaurant Brand Extensions",
        description: "Existing restaurants launching delivery-only spin-off brands. Leverage your kitchen capacity without cannibalizing your main brand."
      },
      {
        title: "Franchise Cloud Kitchens",
        description: "Standardize menus across franchise locations while allowing local adaptations. Maintain brand consistency at scale."
      }
    ],

    stats: [
      { value: "500+", label: "Cloud Kitchens Powered" },
      { value: "3000+", label: "Virtual Brands Managed" },
      { value: "45%", label: "Time Saved on Updates" },
      { value: "99.9%", label: "Platform Uptime" }
    ],

    testimonial: {
      quote: "Managing 8 virtual brands across Swiggy and Zomato used to take hours every day. With MenuThere, I update once and everything syncs. The analytics helped us identify our star performers and sunset underperforming brands. Our revenue per kitchen has increased 35% since we started using it.",
      author: "Vikram Sharma",
      role: "Founder, Ghost Kitchen Ventures",
      location: "Delhi NCR"
    },

    faq: [
      {
        question: "How many brands can I manage from one account?",
        answer: "Unlimited! Whether you run 2 brands or 50, all are managed from a single dashboard. Each brand maintains its own distinct identity and menu."
      },
      {
        question: "Which delivery platforms do you integrate with?",
        answer: "We integrate with Swiggy, Zomato, Dunzo, and other major platforms. Custom integrations are available for enterprise clients."
      },
      {
        question: "Can different team members manage different brands?",
        answer: "Yes! Set up role-based permissions so team members only access the brands they manage. Perfect for large operations with specialized teams."
      },
      {
        question: "How does cross-platform syncing work?",
        answer: "Make changes in Cravings and they automatically push to all connected platforms within minutes. No need to log into each platform separately."
      }
    ],

    relatedSolutions: ["restaurants", "catering", "food-trucks"]
  },

  hotels: {
    slug: "hotels",
    title: "Digital Menus for Hotels & Resorts",
    metaTitle: "Hotel Digital Menu | Resort In-Room Dining Solution | MenuThere",
    metaDescription: "Elegant digital menus for hotels, resorts, and hospitality. In-room dining, restaurant, bar, and poolside service. ",
    keywords: "hotel digital menu, resort menu system, in-room dining technology, hospitality menu software, hotel restaurant POS",
    icon: Building2,
    color: "bg-[#e65a22]",
    heroImage: "/images/solutions/hotel-hero.jpg",

    headline: "Elegant Digital Menus for Hotels & Resorts",
    subheadline: "Elevate your guest experience with sophisticated digital dining across all outlets",

    introduction: `
      In hospitality, every touchpoint matters. From the moment guests check in to their final checkout, you're crafting an experience. Your food and beverage offerings are a crucial part of that experience - whether it's in-room dining at midnight, a romantic dinner at your signature restaurant, or cocktails by the pool.

      MenuThere provides a seamless digital menu experience across all your hotel's F&B outlets. Guests access beautiful, multilingual menus from their smartphones - no app download required. Update prices, add seasonal specials, or mark items unavailable across all outlets from a single dashboard. Reduce operational friction while elevating the guest experience.
    `,

    benefits: [
      {
        icon: Building2,
        title: "Multi-Outlet Management",
        description: "Manage menus for your restaurant, bar, café, room service, poolside, and spa from one dashboard. Consistent experience across all touchpoints."
      },
      {
        icon: Clock,
        title: "24/7 In-Room Dining",
        description: "Guests order from their room anytime. No more outdated paper menus in drawers. Digital menus with real-time availability make late-night ordering seamless."
      },
      {
        icon: Star,
        title: "Premium Presentation",
        description: "Elegant, sophisticated design that matches your hotel's aesthetic. Custom branding, professional photography, and refined typography throughout."
      },
      {
        icon: Bell,
        title: "Order to Room/Table",
        description: "Integrate with your hotel PMS for seamless room service. Guests can charge to room, making ordering frictionless and increasing F&B revenue."
      },
      {
        icon: Globe,
        title: "Concierge Integration",
        description: "Help guests discover local recommendations alongside your offerings. Partner with local experiences for a comprehensive concierge service."
      }
    ],

    features: [
      "Multi-outlet menu management",

      "Room service ordering system",
      "Table reservation integration",
      "PMS and POS integrations",
      "Charge-to-room functionality",
      "Dietary preference filters",
      "Wine list and pairing suggestions",
      "Spa and amenity menus",
      "Guest feedback collection"
    ],

    useCases: [
      {
        title: "Luxury Hotels",
        description: "Create an ultra-premium digital experience matching your 5-star service. Personalized recommendations based on guest preferences and history."
      },
      {
        title: "Beach Resorts",
        description: "Serve guests at the pool, beach, or cabana with location-aware ordering. Staff deliver to sunbeds with order tracking."
      },
      {
        title: "Business Hotels",
        description: "Efficient ordering for busy travelers. Quick breakfast ordering, working lunch menus, and 24/7 room service for any time zone."
      },
      {
        title: "Boutique Properties",
        description: "Intimate, personalized menu experiences that tell your property's unique story. Showcase local, artisanal offerings."
      }
    ],

    stats: [
      { value: "200+", label: "Hotels & Resorts" },
      { value: "25%", label: "Increase in F&B Revenue" },

      { value: "4.9★", label: "Guest Satisfaction" }
    ],

    testimonial: {
      quote: "Room service orders have increased 40% since we went digital. The integration with our PMS for charge-to-room is seamless. Cravings has become an essential part of our guest experience.",
      author: "Sarah Johnson",
      role: "F&B Director, Grand Bay Resort",
      location: "Goa"
    },

    faq: [
      {
        question: "Can guests order room service through the digital menu?",
        answer: "Yes! Guests scan a QR code in their room, browse the menu, and place orders that go directly to your kitchen. They can charge to their room for seamless billing."
      },
      {
        question: "How do you handle multiple restaurant outlets?",
        answer: "Each outlet gets its own menu with distinct branding, but all are managed from one dashboard. You can share items across outlets or keep them completely separate."
      },
      {
        question: "Do you integrate with hotel PMS systems?",
        answer: "Yes, we integrate with major PMS platforms including Opera, Protel, and others. Room charges sync automatically with guest folios."
      }
    ],

    relatedSolutions: ["restaurants", "bars", "catering"]
  },

  "food-trucks": {
    slug: "food-trucks",
    title: "Digital Menus for Food Trucks",
    metaTitle: "Food Truck Digital Menu | Mobile Vendor QR Menu | MenuThere",
    metaDescription: "Your menu, wherever you go. Update your food truck menu on-the-fly. Mobile-first design. Perfect for street food vendors, festivals, and events.",
    keywords: "food truck digital menu, mobile food vendor menu, street food QR code, festival food menu, pop-up restaurant menu, outdoor vendor technology",
    icon: Truck,
    color: "bg-[#e65a22]",
    heroImage: "/images/solutions/food-truck-hero.jpg",

    headline: "Mobile Digital Menus for Food Trucks",
    subheadline: "Your menu goes wherever you go - update on-the-fly and sell more",

    introduction: `
      Food trucks thrive on flexibility. You're at a music festival today, a corporate park tomorrow, and a weekend market on Saturday. Your menu might change based on what's fresh, what sold out, or what the crowd wants. Traditional menus just can't keep up.

      MenuThere is built for the mobile food business. Update your menu from your phone between locations. Mark items sold out in seconds when ingredients run low. Display a single QR code and let customers browse while waiting in line - reducing actual wait times and increasing orders.
    `,

    benefits: [
      {
        icon: Smartphone,
        title: "Update From Your Phone",
        description: "Change prices, mark items sold out, or add a special while standing at your truck. No laptop needed - full menu management from your smartphone."
      },
      {
        icon: Clock,
        title: "Reduce Wait Times",
        description: "Customers browse and decide while waiting in line. When they reach the window, they know exactly what they want. Faster service, happier customers."
      },
      {
        icon: MapPin,
        title: "Location-Based Menus",
        description: "Automatically switch menus based on your location or schedule. Corporate lunches get one menu, night market gets another. Set it and forget it."
      },
      {
        icon: Star,
        title: "Instagram-Ready",
        description: "Beautiful food photography makes customers hungry before they even reach your truck. Shareable menus drive social media buzz."
      },
      {
        icon: CreditCard,
        title: "Pre-Order & Pay",
        description: "Accept pre-orders for pickup at specific times. Customers pay in advance, reducing queues and guaranteeing sales."
      },
      {
        icon: Globe,
        title: "Google Business Sync",
        description: "Update your Google Business Profile automatically when you change locations or menus. Customers always find your latest info."
      }
    ],

    features: [
      "Mobile-first dashboard",
      "Sold-out tracking",
      "Location-based menu switching",
      "Pre-order scheduling",
      "Social media integration",
      "Daily specials featuring",
      "QR code generator",
      "Event mode for festivals",
      "Cash and digital payments",
      "Google Business Profile sync"
    ],

    useCases: [
      {
        title: "Street Food Vendors",
        description: "Simple, visual menus that help customers decide quickly. Perfect for fast-paced street food service where every second counts."
      },
      {
        title: "Festival Food Trucks",
        description: "Survive festival crowds with efficient ordering. Pre-orders reduce queues and guarantee sales."
      },
      {
        title: "Corporate Lunch Trucks",
        description: "Share your daily location and menu with office workers. Accept pre-orders so lunch is ready when they arrive."
      },
      {
        title: "Pop-Up Restaurants",
        description: "Set up anywhere with just a QR code. Perfect for temporary locations, farmers markets, and special events."
      }
    ],

    stats: [
      { value: "800+", label: "Food Trucks Onboard" },
      { value: "50%", label: "Faster Ordering" },
      { value: "Mobile", label: "First Design" },
      { value: "30%", label: "More Pre-Orders" }
    ],

    testimonial: {
      quote: "I update my sold-out items from my phone between customers. The pre-order feature has been game-changing - I know exactly how much to prep. My queues are shorter and sales are up.",
      author: "Ravi Krishnan",
      role: "Owner, Dosa On Wheels",
      location: "Chennai"
    },

    faq: [
      {
        question: "Can I manage everything from my phone?",
        answer: "Absolutely. Our mobile dashboard lets you do everything - add items, change prices, mark sold out, view orders - all from your smartphone."
      },
      {
        question: "How do location-based menus work?",
        answer: "Create different menus for different contexts. Set them to activate based on GPS location, day of week, or time. Your festival menu activates automatically on Saturday."
      },
      {
        question: "What about payments?",
        answer: "Accept UPI, card payments, and cash. Pre-orders can require advance payment or allow pay-at-pickup. Flexible to match your workflow."
      },
      {
        question: "Can I share my location with customers?",
        answer: "Yes! Update your Google Business Profile with your current location. Customers can find you on Google Maps wherever you set up shop."
      }
    ],

    relatedSolutions: ["restaurants", "catering", "cloud-kitchens"]
  },

  bars: {
    slug: "bars",
    title: "Digital Menus for Bars & Pubs",
    metaTitle: "Bar Digital Menu | Pub QR Menu | Cocktail Menu App | MenuThere",
    metaDescription: "Dynamic digital menus for bars, pubs, and nightclubs. Showcase cocktails, craft beers, and happy hour specials. Dark mode design, tap rotation updates, age verification.",
    keywords: "bar digital menu, pub QR code menu, cocktail menu app, craft beer menu, nightclub menu, happy hour digital menu, bar technology",
    icon: Wine,
    color: "bg-[#e65a22]",
    heroImage: "/images/solutions/bar-hero.jpg",

    headline: "Dynamic Digital Menus for Bars & Pubs",
    subheadline: "Showcase your cocktail creations and craft selections with style",

    introduction: `
      Your bar is about atmosphere, experience, and exceptional drinks. From craft cocktails mixed by skilled bartenders to a rotating selection of craft beers, every offering tells a story. But in dim lighting, paper menus are hard to read, and your tap selection changes more often than you can print.

      MenuThere brings your bar menu into the digital age with elegant dark mode designs that look stunning in low light. Update your tap rotation in seconds, promote happy hour specials automatically, and showcase your signature cocktails with beautiful photography. Customers browse on their phones, decide what they want, and spend less time flagging down bartenders - which means faster service and more sales.
    `,

    benefits: [
      {
        icon: Palette,
        title: "Dark Mode Design",
        description: "Elegant dark themes that look perfect in bar lighting. Easy to read on phones without blinding customers in a dim atmosphere."
      },
      {
        icon: RefreshCw,
        title: "Tap Rotation Updates",
        description: "Change your draft beer selection with one click. When a keg kicks, update the menu instantly. Customers always see what's actually available."
      },
      {
        icon: Clock,
        title: "Happy Hour Automation",
        description: "Set happy hour prices and times once. The menu automatically shows promotional pricing during those hours and reverts after."
      },
      {
        icon: Star,
        title: "Cocktail Showcasing",
        description: "Beautiful photos of your signature cocktails drive orders. Describe ingredients, show the glassware, tell the story behind each drink."
      },
      {
        icon: Shield,
        title: "Age Verification",
        description: "Optional age gate before viewing the menu. Meets responsible service requirements while creating a premium feel."
      },
      {
        icon: Users,
        title: "Group Ordering",
        description: "Tables can browse and add to a shared order. No more shouting drink orders across the bar. Everyone gets exactly what they want."
      }
    ],

    features: [
      "Dark mode and custom themes",
      "Real-time tap list management",
      "Happy hour scheduling",
      "Cocktail recipe showcasing",
      "Wine list with pairing notes",
      "Age verification gate",
      "Tab management integration",
      "Group ordering feature",
      "Event and live music promotion",
      "Last call notifications"
    ],

    useCases: [
      {
        title: "Cocktail Bars",
        description: "Showcase your mixologist's creations with beautiful imagery. Tell the story behind each cocktail. Suggest food pairings to increase tabs."
      },
      {
        title: "Craft Beer Bars",
        description: "Display your rotating tap selection with style, ABV, brewery info, and tasting notes. Update instantly when kegs change."
      },
      {
        title: "Wine Bars",
        description: "Present your wine list with vineyard information, tasting notes, and food pairing suggestions. By-the-glass and bottle options."
      },
      {
        title: "Nightclubs",
        description: "Bottle service menus, table minimums, and VIP packages. Visual menus that work in loud, dark environments."
      }
    ],

    stats: [
      { value: "600+", label: "Bars & Pubs" },
      { value: "22%", label: "Higher Average Tab" },
      { value: "Real-Time", label: "Tap Updates" },
      { value: "Auto", label: "Happy Hour" }
    ],

    testimonial: {
      quote: "Our tap list changes constantly - sometimes daily. Before Cravings, we had chalkboards that were always out of date. Now I update the menu from my phone in 10 seconds. The dark mode looks amazing in our bar, and customers love browsing cocktails with photos. Our average tab has gone up significantly.",
      author: "Michael Chen",
      role: "Manager, The Crafty Pint",
      location: "Bangalore"
    },

    faq: [
      {
        question: "How does happy hour automation work?",
        answer: "Set your happy hour days and times once. During those hours, the menu automatically shows discounted prices. Reverts to regular pricing automatically after happy hour ends."
      },
      {
        question: "Can I show what's currently on tap?",
        answer: "Yes! Our tap management feature lets you update your draft selection instantly. Mark kegs as empty, add new arrivals, and show ABV and tasting notes for each."
      },
      {
        question: "Do you have age verification?",
        answer: "Optional age gate can be enabled that requires customers to confirm they're of legal drinking age before viewing the menu. Meets responsible service guidelines."
      },
      {
        question: "How does tab management work?",
        answer: "Integrates with your POS for open tabs. Customers can view their running tab and even settle from their phone if you enable that feature."
      }
    ],

    relatedSolutions: ["restaurants", "hotels", "cafes"]
  },

  catering: {
    slug: "catering",
    title: "Digital Menus for Catering Services",
    metaTitle: "Catering Digital Menu | Event Menu Solution | MenuThere",
    metaDescription: "Professional digital menus for caterers. Showcase packages for weddings, corporate events, and parties. Accept inquiries, share menus with clients, track popular items.",
    keywords: "catering digital menu, event catering packages, wedding catering menu, corporate catering solution, party menu planner, catering CRM",
    icon: PartyPopper,
    color: "bg-[#e65a22]",
    heroImage: "/images/solutions/catering-hero.jpg",

    headline: "Professional Digital Menus for Caterers",
    subheadline: "Impress clients with polished menus and streamline your event planning",

    introduction: `
      Catering is a relationship business. Clients trust you with their most important moments - weddings, corporate galas, milestone birthdays. Your menu is often the first impression, shared across email threads and WhatsApp groups as families debate options. A beautiful, professional menu presentation sets you apart from competitors.

      MenuThere helps caterers create stunning digital menus that impress clients from the first click. Share interactive menus via link - clients can browse packages, customize selections, and submit inquiries without endless back-and-forth. Track which items are most popular, identify trends, and optimize your offerings. From inquiry to invoice, streamline your entire workflow.
    `,

    benefits: [
      {
        icon: Star,
        title: "Impress From First Click",
        description: "Beautiful, branded menus that establish professionalism immediately. When clients compare caterers, your presentation stands out."
      },
      {
        icon: Users,
        title: "Easy Sharing",
        description: "Send a single link that clients can share with family, wedding planners, or corporate teams. Everyone sees the same updated menu."
      },
      {
        icon: Palette,
        title: "Custom Event Menus",
        description: "Create bespoke menus for each event. Mix and match packages, add personalized touches, and present a tailored proposal."
      },
      {
        icon: Bell,
        title: "Inquiry Management",
        description: "Receive event inquiries with all details - date, guest count, dietary requirements, budget. Respond quickly with prepared proposals."
      },
      {
        icon: TrendingUp,
        title: "Trend Analysis",
        description: "Track which packages sell best, which items clients request most, and seasonal trends. Data-driven menu optimization."
      },
      {
        icon: CreditCard,
        title: "Quotation System",
        description: "Generate professional quotes based on guest count and selections. Clients approve online, speeding up the booking process."
      }
    ],

    features: [
      "Package-based menu display",
      "Custom event menu builder",
      "Shareable menu links",
      "Inquiry and lead forms",
      "Guest count pricing calculator",
      "Dietary filter options",
      "Photo galleries per cuisine",
      "Testimonial showcasing",
      "WhatsApp/Email integration",
      "Quote generation and approval"
    ],

    useCases: [
      {
        title: "Wedding Caterers",
        description: "Showcase your wedding packages with beautiful imagery. Clients can share menus with families, mix cuisines, and request tastings."
      },
      {
        title: "Corporate Caterers",
        description: "Present lunch packages, conference catering, and corporate event menus. Enable repeat ordering for regular clients."
      },
      {
        title: "Event Planners",
        description: "Offer catering as part of your event packages. Clients select from your menu alongside other event services."
      },
      {
        title: "Home Chefs & Small Caterers",
        description: "Look professional and established with polished digital menus. Compete with larger caterers on presentation."
      }
    ],

    stats: [
      { value: "400+", label: "Caterers Using Cravings" },
      { value: "3x", label: "Faster Quote Process" },
      { value: "45%", label: "More Inquiries Converted" },
      { value: "5000+", label: "Events Catered" }
    ],

    testimonial: {
      quote: "Before MenuThere, I spent hours creating PDF menus for each client inquiry. Now I send a link that looks incredibly professional. Clients can share it with their families, everyone adds comments, and I get all the details I need to quote accurately. My conversion rate from inquiry to booking has nearly doubled.",
      author: "Anita Sharma",
      role: "Founder, Divine Catering Co.",
      location: "Hyderabad"
    },

    faq: [
      {
        question: "How do clients request quotes?",
        answer: "Your digital menu includes an inquiry form where clients enter event date, guest count, dietary needs, and budget. You receive the inquiry instantly via email and WhatsApp."
      },
      {
        question: "Can I create custom menus for each client?",
        answer: "Absolutely. Clone your base menu, customize it for the specific event, and share a unique link. Each client sees their personalized options."
      },
      {
        question: "How does pricing work with variable guest counts?",
        answer: "Set per-person pricing for each package or item. Clients can see estimated totals based on their guest count right on the menu."
      },
      {
        question: "Can clients make selections and changes?",
        answer: "Yes. Clients can browse, make tentative selections, add notes, and submit their preferences. You receive a clear summary to work from."
      }
    ],

    relatedSolutions: ["restaurants", "hotels", "bakeries"]
  }
};

interface SolutionData {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  icon: any;
  color: string;
  heroImage: string;
  headline: string;
  subheadline: string;
  introduction: string;
  benefits: Array<{ icon: any; title: string; description: string }>;
  features: string[];
  useCases: Array<{ title: string; description: string }>;
  stats: Array<{ value: string; label: string }>;
  testimonial: { quote: string; author: string; role: string; location: string };
  faq: Array<{ question: string; answer: string }>;
  relatedSolutions: string[];
}

// Generate static params for all solutions
export function generateStaticParams() {
  return Object.keys(SOLUTIONS_DATA).map((slug) => ({ slug }));
}

// Generate metadata for each solution
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const solution = SOLUTIONS_DATA[slug];
  if (!solution) return { title: "Solution Not Found" };

  return {
    title: solution.metaTitle,
    description: solution.metaDescription,
    keywords: solution.keywords,
    openGraph: {
      title: solution.metaTitle,
      description: solution.metaDescription,
      type: "website",
      url: `https://www.cravings.live/solutions/${solution.slug}`,
    },
  };
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const solution = SOLUTIONS_DATA[slug];

  if (!solution) {
    notFound();
  }

  const headersList = await headers();
  const host = headersList.get("host");
  const config = getDomainConfig(host);
  const appName = "MenuThere";

  const IconComponent = solution.icon;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": solution.faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.cravings.live"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Solutions",
        "item": "https://www.cravings.live/solutions"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": solution.title,
        "item": `https://www.cravings.live/solutions/${slug}`
      }
    ]
  };

  return (
    <main className="min-h-screen bg-[#f4e5d5] relative">
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-[90%] mx-auto px-4 sm:px-6 relative">
          <div className="max-w-4xl">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${solution.color} text-white text-sm font-medium mb-6`}>
              <IconComponent className="w-4 h-4" />
              {solution.title}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-2">
              {solution.headline}
            </h1>
            <p className="text-base text-gray-600 leading-relaxed mb-8 max-w-3xl">
              {solution.subheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-[#e65a22] rounded-xl hover:bg-[#d14d1a] hover:shadow-lg transition-all duration-300"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                href="https://cal.id/cravings"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-900 bg-white border-2 border-gray-200 rounded-xl hover:border-[#e65a22] hover:text-[#e65a22] transition-all duration-300"
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className={`py-8 ${solution.color}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white text-center">
            {solution.stats.map((stat, idx) => (
              <div key={idx}>
                <div className="text-3xl md:text-4xl font-bold">{stat.value}</div>
                <div className="text-sm md:text-base opacity-90">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-20 bg-white/60 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="prose prose-lg prose-gray max-w-none">
            {solution.introduction.replace(/\{appName\}/g, appName).split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="text-gray-600 leading-relaxed text-lg">
                {paragraph.trim()}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose MenuThere for Your {solution.title.split(' for ')[1] || 'Business'}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Purpose-built features designed specifically for your industry
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {solution.benefits.map((benefit, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className={`w-12 h-12 rounded-lg ${solution.color} flex items-center justify-center mb-4`}>
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="py-20 bg-white/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Everything You Need to Succeed
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                A comprehensive toolkit designed to modernize your menu and delight your customers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {solution.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 text-green-500`} />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${solution.color} rounded-2xl p-8 text-white shadow-xl`}>
              <IconComponent className="w-16 h-16 mb-6 opacity-80" />
              <h3 className="text-2xl font-bold mb-4">Ready to get started?</h3>
              <p className="text-lg opacity-90 mb-6">
                Join thousands of businesses already using MenuThere to transform their menu experience.
              </p>
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center px-6 py-3 text-lg font-semibold bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Perfect For Every Type of {solution.title.split(' for ')[1]?.split(' ')[0] || 'Business'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {solution.useCases.map((useCase, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{useCase.title}</h3>
                <p className="text-gray-600 leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-white/60 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className={`${solution.color} rounded-2xl p-8 md:p-12 text-white shadow-xl`}>
            <div className="flex gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 fill-current" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl font-medium leading-relaxed mb-8">
              "{solution.testimonial.quote.replace(/\{appName\}/g, appName)}"
            </blockquote>
            <div>
              <div className="font-bold text-lg">{solution.testimonial.author}</div>
              <div className="opacity-80">{solution.testimonial.role}</div>
              <div className="opacity-60 text-sm">{solution.testimonial.location}</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQAccordion items={solution.faq} />



      {/* CTA */}
      <section className="py-20 bg-[#e65a22] relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Menu?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of {solution.title.split(' for ')[1]?.toLowerCase() || 'businesses'} already using MenuThere
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-[#e65a22] bg-white rounded-xl hover:bg-gray-50 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white rounded-xl hover:bg-white/10 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
