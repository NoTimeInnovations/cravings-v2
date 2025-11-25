export const DIETARY_TAGS = [
    "Vegan",
    "Vegetarian",
    "Jain",
    "Eggetarian",
    "Gluten-free",
    "Sugar-free",
    "Keto-friendly",
    "Diabetic-friendly",
    "High-protein",
    "Low-carb",
    "Low-fat",
    "Satvik",
];

export const ALLERGEN_TAGS = [
    "Contains Nuts",
    "Contains Cashew",
    "Contains Peanuts",
    "Contains Dairy",
    "Contains Gluten",
    "Contains Soy",
    "Contains Eggs",
    "Contains Sesame",
    "Contains Shellfish",
    "Contains Fish",
    "Contains Mustard",
    "Contains Chocolate",
];

export const CHARACTERISTIC_TAGS = [
    "Spicy",
    "Extra Spicy",
    "Mild",
    "Kids-friendly",
    "Bestseller",
    "Chef Special",
    "Healthy Choice",
    "Organic Ingredients",
    "No Onion",
    "No Garlic",
    "Seasonal",
    "Freshly Made",
    "Served Hot",
    "Served Cold",
];

export const CUISINE_TAGS = [
    "Indian",
    "Chinese",
    "Continental",
    "Italian",
    "Arabian",
    "South Indian",
    "North Indian",
    "Thai",
    "Japanese",
    "Mexican",
    "Fusion",
];

export const TAG_CATEGORIES = [
    {
        name: "Dietary Preference",
        tags: DIETARY_TAGS,
        color: "bg-green-100 text-green-800 border-green-200",
        type: "dietary",
    },
    {
        name: "Allergen & Ingredient Warning",
        tags: ALLERGEN_TAGS,
        color: "bg-red-100 text-red-800 border-red-200",
        type: "allergen",
    },
    {
        name: "Food Characteristics",
        tags: CHARACTERISTIC_TAGS,
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        type: "characteristic",
    },
    {
        name: "Cuisine",
        tags: CUISINE_TAGS,
        color: "bg-gray-100 text-gray-800 border-gray-200",
        type: "cuisine",
    },
];

export const getTagColor = (tag: string) => {
    if (DIETARY_TAGS.includes(tag)) return "bg-green-100 text-green-800 border-green-200";
    if (ALLERGEN_TAGS.includes(tag)) return "bg-red-100 text-red-800 border-red-200";
    if (CHARACTERISTIC_TAGS.includes(tag)) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (CUISINE_TAGS.includes(tag)) return "bg-gray-100 text-gray-800 border-gray-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
};
