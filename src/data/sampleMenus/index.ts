import southIndianData from "./southIndian.json";
import cakeHouseData from "./cakeHouse.json";
import arabicRestaurantData from "./arabicRestaurant.json";

export interface SampleMenuOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  items: any[];
}

export const sampleMenus: SampleMenuOption[] = [
  {
    id: "south-indian",
    name: "South Indian Restaurant",
    description: "Biriyani, dosa, curries, thalis & more",
    icon: "🍛",
    items: southIndianData,
  },
  {
    id: "cake-house",
    name: "Cake House",
    description: "Cakes, pastries, desserts & beverages",
    icon: "🎂",
    items: cakeHouseData,
  },
  {
    id: "arabic-restaurant",
    name: "Arabic Restaurant",
    description: "Mandi, shawarma, grills & Arabic specials",
    icon: "🥘",
    items: arabicRestaurantData,
  },
];
