import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import React from "react";
import HotelBanner from "./HotelBanner";
import DescriptionWithTextBreak from "@/components/DescriptionWithTextBreak";
import ThemeChangeButton, { ThemeConfig } from "../../ThemeChangeButton";
import SocialLinkList from "@/components/SocialLinkList";
import SearchMenu from "../../SearchMenu";
import OfferList from "./OfferList";
import { getFeatures } from "@/lib/getFeatures";
import MenuItemsList from "./MenuItemsList_v2";
import PopularItemsList from "./PopularItemsList";
import OrderDrawer from "../../OrderDrawer";
import RateThis from "@/components/RateThis";
import { Styles } from "@/screens/HotelMenuPage_v2";
import {
  HotelData,
  HotelDataMenus,
  SocialLinks,
} from "@/app/hotels/[...id]/page";
import { Offer } from "@/store/offerStore_hasura";
import { Category } from "@/store/categoryStore_hasura";
import { QrGroup } from "@/app/admin/qr-management/page";
import { useSearchParams } from "next/navigation";

export interface DefaultHotelPageProps {
  styles: Styles;
  theme: ThemeConfig | null;
  open_place_order_modal: boolean;
  hoteldata: HotelData;
  socialLinks: SocialLinks;
  offers: Offer[];
  tableNumber: number;
  auth: {
    id: string;
    role: string;
  } | null;
  topItems: HotelDataMenus[];
  items: HotelDataMenus[];
  pathname: string;
  categories: Category[];
  setSelectedCategory: (category: string) => void;
  qrGroup?: QrGroup | null;
  qrId?: string | null;
}

const Default = ({
  styles,
  theme,
  open_place_order_modal,
  hoteldata,
  socialLinks,
  offers,
  tableNumber,
  auth,
  topItems,
  items: initialItems,
  pathname,
  categories,
  setSelectedCategory,
  qrGroup,
  qrId,
}: DefaultHotelPageProps) => {

  const [isThemeDialogOpen, setIsThemeDialogOpen] = React.useState(false);
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("cat") || "all";

  // Helper function to check if a menu item has an active offer
  const hasActiveOffer = (menuItemId: string) => {
    return offers.some((offer) => offer.menu && offer.menu.id === menuItemId);
  };

  // getCategoryItems logic (updated to match HotelMenuPage_v2)
  const getCategoryItems = (selectedCategory: string) => {
    if (selectedCategory === "all") {
      return (
        hoteldata?.menus.filter(
          (item) =>
            item.category.is_active === undefined ||
            item.category.is_active === true
        ) || []
      );
    }
    
    // Handle the special "Offer" category
    if (selectedCategory === "Offer") {
      const offeredItems = hoteldata?.menus.filter(
        (item) =>
          item.id && hasActiveOffer(item.id) &&
          (item.category.is_active === undefined ||
            item.category.is_active === true)
      ) || [];
      
      // Sort offered items with images first
      const sortedItems = [...offeredItems].sort((a, b) => {
        if (a.image_url.length && !b.image_url.length) return -1;
        if (!a.image_url.length && b.image_url.length) return 1;
        return 0;
      });
      return sortedItems;
    }

    const filteredItems = hoteldata?.menus.filter(
      (item) =>
        item.category.name === selectedCategory &&
        (item.category.is_active === undefined ||
          item.category.is_active === true)
    );
    const sortedItems = [...filteredItems].sort((a, b) => {
      if (a.image_url.length && !b.image_url.length) return -1;
      if (!a.image_url.length && b.image_url.length) return 1;
      return 0;
    });
    return sortedItems;
  };

  const items = getCategoryItems(selectedCategory);

  return (
    <main
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        fontFamily: theme?.fontFamily || "Poppins, sans-serif",
      }}
      className={`overflow-x-hidden relative min-h-screen flex flex-col gap-6 lg:px-[20%]`}
    >
      {/* Only show menu content when not in order placement view */}
      {!open_place_order_modal ? (
        <>
          {/* shop closed modal */}
          <ShopClosedModalWarning
            hotelId={hoteldata?.id}
            isShopOpen={hoteldata?.is_shop_open}
          />

          {/* top part  */}
          <section className="px-[8%] pt-[20px]">
            {/* hotel details  */}
            <div
              style={{
                alignItems: theme?.infoAlignment || "start",
              }}
              className="flex flex-col gap-3"
            >
              {/* banner image  */}
              <HotelBanner hoteldata={hoteldata} styles={styles} />

              <h1
                style={{
                  textAlign:
                    theme?.infoAlignment === "center" ? "center" : "left",
                }}
                className={"font-black text-3xl max-w-[250px]"}
                dangerouslySetInnerHTML={{
                  __html: hoteldata?.store_name || "",
                }}
              />

              <DescriptionWithTextBreak
                style={{
                  textAlign:
                    theme?.infoAlignment === "center" ? "center" : "left",
                }}
                accent={styles.accent}
              >
                {hoteldata?.description}
              </DescriptionWithTextBreak>
            </div>

            {/* right top button  */}
            <div onClick={()=>setIsThemeDialogOpen(true)} className="absolute right-[8%] top-[20px] flex flex-col items-center gap-3">
              {hoteldata?.id === auth?.id && (
                <ThemeChangeButton isOpen={isThemeDialogOpen} hotelData={hoteldata} theme={theme} />
              )}
              <SocialLinkList
                styles={styles}
                socialLinks={socialLinks}
                hotelId={hoteldata?.id}
              />
            </div>
          </section>

          {/* search bar  */}
          <section className="px-[8%]">
            <SearchMenu
              hotelData={hoteldata}
              currency={hoteldata?.currency}
              styles={styles}
              menu={hoteldata.menus}
            />
          </section>

          {/* offers - only show when NOT in Offer category */}
          {/* {offers.length > 0 && selectedCategory !== "Offer" && (
            <section className="px-[8%]">
              <OfferList
                offers={offers}
                styles={styles}
                menus={hoteldata?.menus}
                features={getFeatures(hoteldata?.feature_flags || "")}
              />
            </section>
          )} */}

          {/* popular - always show (Must Try section) */}
          {topItems.length > 0 && (
            <section>
              <PopularItemsList
                hotelData={hoteldata}
                currency={hoteldata?.currency}
                items={topItems}
                styles={styles}
                tableNumber={tableNumber}
              />
            </section>
          )}

          {/* menu  */}
          <section>
            <MenuItemsList
              currency={hoteldata?.currency}
              styles={styles}
              items={items}
              hotelData={hoteldata}
              categories={categories}
              setSelectedCategory={setSelectedCategory}
              tableNumber={tableNumber}
            />
          </section>
        </>
      ) : null}

      {/* rating  */}
      {!open_place_order_modal && (
        <section
          className={`px-[8.5%] mt-10 ${hoteldata?.footnote ? "" : "mb-40"}`}
        >
          <RateThis styles={styles} hotel={hoteldata} type="hotel" />
        </section>
      )}

      {/* footnote  */}
      {hoteldata?.footnote && !open_place_order_modal && (
        <section
          style={{
            borderTop: `${styles.border.borderWidth} ${styles.border.borderStyle} ${styles.border.borderColor}`,
            backgroundColor: `${styles.color}1D`,
          }}
          className="px-[8.5%] pt-10 pb-36 mt-10"
        >
          <div
            style={{
              color: `${styles.color}9D`,
            }}
            className="text-center text-sm"
          >
            {hoteldata?.footnote}
          </div>
        </section>
      )}
    </main>
  );
};

export default Default;