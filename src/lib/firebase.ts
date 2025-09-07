import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
// import { getMessaging, getToken } from "firebase/messaging";
// import subscribeTopic from "./subscibeTopic";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: `https://foodoffers-2cedb-default-rtdb.asia-southeast1.firebasedatabase.app`,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);


// export const messaging = getMessaging(app);
// // let retryTimes = 0;

// export const generateToken = async () => {
//   // if (retryTimes >= 100) {
//   //   console.error("Max retry attempts reached. Stopping retries.");
//   //   return;
//   // }
//   // retryTimes++;
//   const permission = await Notification.requestPermission();
//   let timeout;

//   console.log("Notification permission:", permission);
//   if (permission === "granted") {
//     try {
//       const currentToken = await getToken(messaging, {
//         vapidKey:
//           "BFU5alXLphNpTi0MUbQ9br2rQAscs3pDYXaO_nsCZCsD1Y3z8lqOpBRqQSOeUw2r0WYDxJS6BE1aaoreDVraJIY",
//       });
//       if (currentToken) {
//         await subscribeTopic(currentToken);
//         if (timeout) clearTimeout(timeout);
//       } else {
//         console.error(
//           "No registration token available. Request permission to generate one."
//         );
//       }
//     } catch (error) {
//       console.error("An error occurred while retrieving token. ", error);
//       // timeout = setTimeout(async () => {
//       //   await generateToken();
//       // }, 5000);
//     }
//   } else {
//     console.warn("Permission not granted for notifications.");
//   }
// };
