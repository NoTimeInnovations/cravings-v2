"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Banknote } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

const CravingsCashInfoModal = () => {
  const [open, setOpen] = useState(false);
  const { userData } = useAuthStore();

  useEffect(() => {
    const request = indexedDB.open("firebaseLocalStorageDb");

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction("firebaseLocalStorage", "readonly");
      const store = transaction.objectStore("firebaseLocalStorage");
      const getAllKeysRequest = store.getAllKeys();

      getAllKeysRequest.onsuccess = () => {
        const notInitialRun = localStorage?.getItem("notInitialRun");

        if (getAllKeysRequest.result.length == 0 && !notInitialRun) {
          setOpen(true);
        }
      };

      getAllKeysRequest.onerror = () => {
        console.error("Error fetching keys from firebaseLocalStorage");
      };
    };

    request.onerror = () => {
      console.error("Error opening firebaseLocalStorageDb");
    };
  }, [userData]);

  return (
    <Dialog
      open={open}
      onOpenChange={(value: boolean) => {
        setOpen(value);
        localStorage?.setItem("notInitialRun", "true");
      }}
    >
      <DialogContent className="max-w-[90%] sm:max-w-sm grid justify-items-center rounded-3xl py-10 px-10 gap-5">
        <h1 className="font-bold text-2xl text-center">
          🎉Welcome to <span className="text-orange-600">Cravings</span>!
        </h1>

        <div className="grid justify-items-center text-orange-600 text-2xl font-bold">
          <Banknote size={100} />
          <h1>₹100 Rs</h1>
        </div>

        <p className="text-center text-black/80">
          Sign up now and get ₹100 Cravings Cash to enjoy delicious offers! 💰
        </p>

        <div className="flex gap-2 items-center">
          <div
            onClick={() => setOpen(false)}
            className="text-black border-[1px] rounded-full text-center cursor-pointer  px-6 py-2 font-semibold hover:border-black transition-all"
          >
            Close
          </div>
          <Link
            onClick={() => setOpen(false)}
            href={"/login"}
            className="text-white rounded-full bg-orange-600 px-6 py-2 font-semibold hover:bg-oragne-500 transition-all"
          >
            Get Now
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CravingsCashInfoModal;
