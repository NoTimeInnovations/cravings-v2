// "use client";
// import { Offer } from "@/store/offerStore";
// import React, { useEffect, useState } from "react";
// import { useMediaQuery } from "usehooks-ts";
// import { Button } from "@/components/ui/button";
// import { Dialog, DialogContent } from "@/components/ui/dialog";
// import { Drawer, DrawerContent } from "@/components/ui/drawer";
// import { Input } from "@/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
// import { saveSurvey } from "@/app/actions/saveSurvey";

// const SurveyDialog = ({ offers }: { offers: Offer[] }) => {
//   const [isUserNearby, setIsUserNearby] = useState(true);
//   const isDesktop = useMediaQuery("(min-width: 768px)");

//   useEffect(() => {
//     const nearestOffer = offers[0];

//     if (nearestOffer) {
//       const distance = ((Number(nearestOffer.distance) ?? 0) / 1000).toFixed(2);
//       const distanceNumber = Number(distance);

//       console.log("Distance from nearest offer:", distanceNumber);
//       const hasSurveySubmitted =
//         localStorage?.getItem("surveySubmitted") === "1";
//       if (distanceNumber >= 35 && !hasSurveySubmitted) {
//         setIsUserNearby(false);
//       } else {
//         setIsUserNearby(true);
//       }
//     }
//   }, [offers]);

//   const handleOpenChange = () => {
//     setIsUserNearby(true);
//   };

//   if (isDesktop) {
//     return (
//       <Dialog open={!isUserNearby} onOpenChange={handleOpenChange}>
//         <DialogContent className="sm:max-w-[425px]">
//           <SurveyForm setIsUserNearby={setIsUserNearby} />
//         </DialogContent>
//       </Dialog>
//     );
//   }

//   return (
//     <Drawer open={!isUserNearby} onOpenChange={handleOpenChange}>
//       <DrawerContent>
//         <SurveyForm setIsUserNearby={setIsUserNearby} className="px-4" />
//       </DrawerContent>
//     </Drawer>
//   );
// };

// const districts = [
//   "Thiruvananthapuram",
//   "Kollam",
//   "Pathanamthitta",
//   "Alappuzha",
//   "Kottayam",
//   "Idukki",
//   "Ernakulam",
//   "Thrissur",
//   "Palakkad",
//   "Malappuram",
//   "Kozhikode",
//   "Wayanad",
//   "Kannur",
//   "Kasaragod",
// ];

// const SurveyForm = ({
//   className,
//   setIsUserNearby,
// }: {
//   className?: string;
//   setIsUserNearby: React.Dispatch<React.SetStateAction<boolean>>;
// }) => {
//   const [selectedDistrict, setSelectedDistrict] = useState("");
//   const [favoriteHotels, setFavoriteHotels] = useState<string[]>([]);
//   const [hotelInput, setHotelInput] = useState("");
//   const [favoriteFoods, setFavoriteFoods] = useState<string[]>([]);
//   const [foodInput, setFoodInput] = useState("");
//   const [hotelSuggestions, setHotelSuggestions] = useState<string[]>([]);
//   const [allHotels, setAllHotels] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isValid, setIsValid] = useState(false);

//   useEffect(() => {
//     if (selectedDistrict) {
//       const query = `
//           [out:json];
//           area["name"="${selectedDistrict}"]->.a;
//           node(area.a)["amenity"="restaurant"];
//           out body;
//         `;
//       const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
//         query
//       )}`;

//       fetch(url)
//         .then((response) => response.json())
//         .then((data) => {
//           const restaurants = data.elements
//             .filter((element: { tags: { name: string } }) => element.tags.name)
//             .map((element: { tags: { name: string } }) => element.tags.name);
//           setHotelSuggestions(restaurants);
//           setAllHotels(data.elements);
//         })
//         .catch((error) => console.error("Error fetching hotels:", error));
//     }
//   }, [selectedDistrict]);

//   useEffect(() => {
//     setIsValid(
//       !!selectedDistrict &&
//         favoriteHotels.length > 0 &&
//         favoriteFoods.length > 0
//     );
//   }, [selectedDistrict, favoriteHotels, favoriteFoods]);

//   const handleHotelInput = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setHotelInput(e.target.value);
//   };

//   const addHotel = () => {
//     if (
//       hotelInput &&
//       favoriteHotels.length < 5 &&
//       !favoriteHotels.includes(hotelInput)
//     ) {
//       setFavoriteHotels([...favoriteHotels, hotelInput]);
//       setHotelInput("");
//     }
//   };

//   const removeHotel = (hotel: string) => {
//     setFavoriteHotels(favoriteHotels.filter((h) => h !== hotel));
//   };

//   const handleFoodInput = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFoodInput(e.target.value);
//   };

//   const addFood = () => {
//     if (
//       foodInput &&
//       favoriteFoods.length < 5 &&
//       !favoriteFoods.includes(foodInput)
//     ) {
//       setFavoriteFoods([...favoriteFoods, foodInput]);
//       setFoodInput("");
//     }
//   };

//   const removeFood = (food: string) => {
//     setFavoriteFoods(favoriteFoods.filter((f) => f !== food));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);
//     const selectedHotelDetails = allHotels.filter(
//       (hotel: { tags: { name: string } }) =>
//         favoriteHotels.includes(hotel.tags.name)
//     );

//     const formData = {
//       district: selectedDistrict,
//       favoriteHotels: favoriteHotels.join(", "),
//       favoriteFoods: favoriteFoods.join(", "),
//       hotelDetails: selectedHotelDetails,
//     };

//     console.log("Survey data:", formData);

//     try {
//       await saveSurvey(formData);
//       alert("Survey submitted successfully!");
//     } catch (error) {
//       console.error("Error submitting survey:", error);
//       alert("Failed to submit survey. Please try again.");
//     }

//     setIsLoading(false);
//     setIsUserNearby(true);
//     localStorage?.setItem("surveySubmitted", "1");
//   };

//   return (
//     <form className={`p-4 bg-white ${className}`}>
//       <h2 className="text-lg font-semibold text-orange-600">Customer Survey</h2>
//       <p className="mb-4 text-sm text-black/30">
//         Since you&apos;re too far to enjoy our offers, tell us your favorite
//         food and restaurant so we can serve you better.
//       </p>

//       <label className="block mb-2">Select your district</label>
//       <Select onValueChange={setSelectedDistrict}>
//         <SelectTrigger>{selectedDistrict || "Choose a district"}</SelectTrigger>
//         <SelectContent>
//           {districts.map((district) => (
//             <SelectItem key={district} value={district}>
//               {district}
//             </SelectItem>
//           ))}
//         </SelectContent>
//       </Select>

//       <label className="block mt-4 mb-2">Favorite Hotels (up to 5)</label>
//       <div className="flex flex-wrap gap-2 mb-2">
//         {favoriteHotels.map((hotel) => (
//           <span
//             key={hotel}
//             className="px-2 py-1 text-[12px] bg-orange-200 text-orange-800 rounded-full flex items-center space-x-2"
//           >
//             <span>{hotel}</span>
//             <button
//               type="button"
//               onClick={() => removeHotel(hotel)}
//               className="text-red-500 font-bold"
//             >
//               &times;
//             </button>
//           </span>
//         ))}
//       </div>
//       <div className="flex gap-2">
//         <Input
//           value={hotelInput}
//           onChange={handleHotelInput}
//           placeholder="Type hotel name"
//           list="hotelSuggestions"
//         />
//         <Button
//           onClick={addHotel}
//           disabled={!hotelInput || favoriteHotels.length >= 5}
//         >
//           Add
//         </Button>
//       </div>
//       <datalist id="hotelSuggestions">
//         {hotelSuggestions.map((hotel, index) => (
//           <option key={index} value={hotel} />
//         ))}
//       </datalist>

//       <label className="block mt-4 mb-2">Favorite Foods (up to 5)</label>
//       <div className="flex flex-wrap gap-2 mb-2">
//         {favoriteFoods.map((food) => (
//           <span
//             key={food}
//             className="px-2 py-1 text-[12px] bg-orange-200 text-orange-800 rounded-full flex items-center space-x-2"
//           >
//             <span>{food}</span>
//             <button
//               type="button"
//               onClick={() => removeFood(food)}
//               className="text-red-500 font-bold"
//             >
//               &times;
//             </button>
//           </span>
//         ))}
//       </div>
//       <div className="flex gap-2">
//         <Input
//           value={foodInput}
//           onChange={handleFoodInput}
//           placeholder="Type food name"
//         />
//         <Button
//           onClick={addFood}
//           disabled={!foodInput || favoriteFoods.length >= 5}
//         >
//           Add
//         </Button>
//       </div>

//       <Button
//         onClick={isLoading ? undefined : handleSubmit}
//         disabled={isLoading || !isValid}
//         type="submit"
//         className="mt-6 w-full disabled:pointer-events-none disabled:opacity-50 bg-orange-600 hover:bg-orange-500 text-white font-medium"
//       >
//         {isLoading ? "Submitting..." : "Submit"}
//       </Button>
//     </form>
//   );
// };

// export default SurveyDialog;


import React from 'react'

const SurveyDialog = () => {
  return (
    <div>SurveyDialog</div>
  )
}

export default SurveyDialog