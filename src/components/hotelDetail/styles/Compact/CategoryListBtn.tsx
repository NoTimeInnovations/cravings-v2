"use client";

import React, { useState, useEffect, useRef } from "react";
import { Book, X } from "lucide-react";
import useOrderStore from "@/store/orderStore";
import { Category, formatDisplayName } from "@/store/categoryStore_hasura";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
// import { MyOrdersButton } from "./MyOrdersButton";


const CategoryListBtn: React.FC<{ categories: Category[]; hasBottomNav?: boolean }> = ({
  categories,
  hasBottomNav = false,
}) => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isMoveUp, setMoveUp] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { items } = useOrderStore();
  const [hasItems, setHasItems] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { userData } = useAuthStore();

  useEffect(() => {
    setHasItems((items?.length ?? 0) > 0);
  }, [items]);

  // Handles moving the button up or down based on scroll direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setMoveUp(false); // Scrolling down
      } else if (currentScrollY < lastScrollY) {
        setMoveUp(true); // Scrolling up
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Handles closing the menu when a user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  // Determines the button's vertical position based on scroll and cart status
  const baseBottom = hasBottomNav ? "bottom-20" : "bottom-4";
  const raisedBottom = hasBottomNav ? "bottom-44" : "bottom-28";

  const bottomPositionClass = isMoveUp
    ? hasItems
      ? raisedBottom // Scrolled up with items
      : baseBottom // Scrolled up without items
    : hasItems
      ? raisedBottom // Scrolled down with items
      : baseBottom; // Scrolled down without items

  return (
    <div
      ref={menuRef}
      className={`fixed right-4 z-40 transition-all duration-500 ${bottomPositionClass}`}
    >
      {/* Category Menu Panel */}
      {isMenuOpen && (
        <div className="bg-white rounded-lg shadow-2xl mb-3 w-56 border border-gray-200">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Menu</h3>
          </div>
          <nav className="py-1 max-h-72 overflow-y-auto">
            <ul>
              {categories.length > 0 ? (
                categories.map((category) => (
                  <li key={category.id}>
                    <a
                      href={`#${category.name}`}
                      onClick={handleLinkClick}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      {formatDisplayName(category.name)}
                    </a>
                  </li>
                ))
              ) : (
                <li className="px-4 py-2 text-sm text-gray-500">
                  No categories found.
                </li>
              )}
            </ul>
          </nav>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setMenuOpen(!isMenuOpen)}
        className="flex ml-auto items-center justify-center h-14 w-14 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all duration-300 transform hover:scale-110"
        aria-label="Toggle category menu"
      >
        {isMenuOpen ? <X size={24} /> : <Book size={24} />}
      </button>


      {/* floating button to view orders if user is logged in 
      <MyOrdersButton /> */}
    </div>
  );
};

export default CategoryListBtn;
