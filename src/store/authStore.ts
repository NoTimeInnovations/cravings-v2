import { create } from "zustand";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getUserByIdQuery,
  partnerMutation,
  partnerQuery,
  userLoginMutation,
  userLoginQuery,
  partnerLoginQuery,
  superAdminLoginQuery,
  partnerIdQuery,
  superAdminIdQuery,
} from "@/api/auth";
import {
  getAuthCookie,
  setAuthCookie,
  removeAuthCookie,
  removeLocationCookie,
} from "@/app/auth/actions";
import { sendRegistrationWhatsAppMsg } from "@/app/actions/sendWhatsappMsgs";
import { FeatureFlags, getFeatures } from "@/lib/getFeatures";
import { DeliveryRules } from "./orderStore";
import { Notification } from "@/app/actions/notification";
import { addAccount, getAccounts, getAllAccounts } from "@/lib/addAccount";
import { transferTempDataToUserAccount } from "@/lib/transferTempDataToUserAccount";
import { CommonOffer } from "@/components/superAdmin/OfferUploadSuperAdmin";

interface BaseUser {
  id: string;
  email: string;
  role: "user" | "partner" | "superadmin" | "captain";
}
export interface GeoLocation {
  type: "Point";
  coordinates: [number, number];
  crs?: {
    type: string;
    properties: {
      name: string;
    };
  };
}

interface Address {
  id: string;
  label: string; // e.g., "Home", "Office"
  address: string; // full address string
  isDefault?: boolean;
}

export interface User extends BaseUser {
  role: "user";
  password: string;
  full_name: string;
  phone: string;
  crave_coins: number;
  addresses?: Address[];
  location: {
    type: "Point";
    coordinates: [number, number];
  } | null;
}

export interface Partner extends BaseUser {
  role: "partner";
  name: string;
  password: string;
  store_name: string;
  store_banner?: string;
  location: string;
  status: string;
  upi_id: string;
  description: string | null;
  whatsapp_numbers: {
    number: string;
    area: string;
  }[];
  phone: string;
  district: string;
  delivery_status: boolean;
  geo_location: GeoLocation;
  delivery_rate: number;
  delivery_rules: DeliveryRules;
  location_details?: string | null;
  place_id?: string;
  theme?: string;
  currency: string;
  feature_flags?: string;
  footnote?: string;
  social_links?: string;
  gst_no?: string;
  gst_percentage?: number;
  business_type?: string;
  is_shop_open: boolean;
  country?: string;
  country_code?: string;
  distance_meters?: number;
  common_offers?: CommonOffer[];
}

export interface SuperAdmin extends BaseUser {
  role: "superadmin";
  password: string;
}

export interface Captain extends BaseUser {
  id: string;
  role: "captain";
  partner_id: string;
  password: string;
  currency?: string;
  gst_percentage?: number;
  name: string;
  partner?: Partial<Partner>;
}

export type AuthUser = User | Partner | SuperAdmin | Captain;

interface AuthState {
  userData: AuthUser | null;
  features: FeatureFlags | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  signUpWithEmailForPartner: (
    hotelName: string,
    phone: string,
    upiId: string,
    area: string,
    email: string,
    password: string,
    country: string,
    state: string,
    location: string,
    geoLocation: {
      latitude: number;
      longitude: number;
    }
  ) => Promise<void>;
  createPartner: (
    hotelName: string,
    phone: string,
    upiId: string,
    area: string,
    location: string,
    email: string,
    password: string
  ) => Promise<Partner>;
  signInWithPhone: (phone: string, partnerId?: string) => Promise<User | null>;
  signInPartnerWithEmail: (email: string, password: string) => Promise<void>;
  signInSuperAdminWithEmail: (email: string, password: string) => Promise<void>;
  signInCaptainWithEmail: (email: string, password: string) => Promise<void>;
  fetchUser: () => Promise<void>;
  isLoggedIn: () => boolean;
  setState: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userData: null,
  loading: true,
  error: null,
  features: null,

  isLoggedIn: () => {
    return !!getAuthCookie();
  },

  fetchUser: async () => {
    try {
      set({ loading: true });
      const authData = await getAuthCookie();

      if (!authData || !authData.id || !authData.role) {
        return;
      }

      const { id, role } = authData;

      if (role === "user") {
        const response = await fetchFromHasura(getUserByIdQuery, { id });
        const user = response?.users_by_pk;
        if (user) {
          set({
            userData: {
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              phone: user.phone,
              crave_coins: user.crave_coins,
              location: user.location,
              addresses: user.addresses,
              password: "",
              role: "user",
            } as User,
          });
        }
      } else if (role === "partner") {
        const response = await fetchFromHasura(partnerIdQuery, { id });
        const partner = response?.partners_by_pk;

        if (partner) {
          set({
            userData: {
              ...partner,
              password: "",
              currency: partner.currency,
              whatsapp_numbers: partner.whatsapp_numbers,
              location_details: partner.location_details,
              geo_location: {
                type: partner.geo_location?.type,
                coordinates: partner.geo_location?.coordinates,
              },
              role: "partner",
            } as Partner,
            features: getFeatures(partner.feature_flags),
          });
        }
      } else if (role === "superadmin") {
        const response = await fetchFromHasura(superAdminIdQuery, { id });
        const superAdmin = response?.super_admin_by_pk;
        if (superAdmin) {
          set({
            userData: {
              ...superAdmin,
              password: "",
              role: "superadmin",
            } as SuperAdmin,
          });
        }
      } else if (role === "captain") {
        const response = await fetchFromHasura(
          `
          query GetCaptainById($id: uuid!) {
            captain_by_pk(id: $id) {
              id
              email
              partner_id
              role
              name
            }
          }
        `,
          { id }
        );

        if (response?.captain_by_pk) {
          const captain = response.captain_by_pk;

          const partnerResponse = await fetchFromHasura(
            `
            query GetPartnerData($partner_id: uuid!) {
              partners_by_pk(id: $partner_id) {
                id
                currency
                gst_percentage
                store_name
              }
            }
          `,
            { partner_id: captain.partner_id }
          );

          if (partnerResponse?.partners_by_pk) {
            const partnerData = partnerResponse.partners_by_pk;
            set({
              userData: {
                ...captain,
                currency: partnerData.currency || "₹",
                gst_percentage: partnerData.gst_percentage || 0,
                partner: partnerData,
              },
              loading: false,
            });
          } else {
            set({
              userData: {
                ...captain,
                currency: "₹",
                gst_percentage: 0,
              },
              loading: false,
            });
          }
        }
      }
    } catch (error) {
      await removeAuthCookie();
      set({ userData: null });
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    const fcmToken = localStorage?.getItem("fcmToken");
    const isApp = localStorage?.getItem("isApp");
    const accounts = await getAllAccounts();
    
    // Preserve hotel-specific localStorage? items
    const hotelLocationItems: { [key: string]: string | null } = {};
    for (let i = 0; i < localStorage?.length; i++) {
      const key = localStorage?.key(i);
      if (key && (key.startsWith('hotel-') || key.startsWith('user-location-store'))) {
        hotelLocationItems[key] = localStorage?.getItem(key);
      }
    }
    
    await Notification.token.remove();
    await removeAuthCookie();
    await removeLocationCookie();
    localStorage?.clear();
    if (fcmToken) localStorage?.setItem("fcmToken", fcmToken);
    if (isApp) localStorage?.setItem("isApp", isApp);
    
    // Restore hotel-specific items
    Object.entries(hotelLocationItems).forEach(([key, value]) => {
      if (value !== null) {
        localStorage?.setItem(key, value);
      }
    });
    
    if (accounts && accounts.length > 0) {
      accounts.forEach((account : any) => {
        addAccount({...account});
      });
    }
    set({ userData: null, error: null });
  },

  signUpWithEmailForPartner: async (
    hotelName,
    phone,
    upiId,
    area,
    email,
    password,
    country,
    state,
    location,
    geoLocation
  ) => {
    set({ loading: true, error: null });
    try {
      await get().signOut();
      const existingPartner = await fetchFromHasura(partnerQuery, { email });
      if (existingPartner?.partners?.length > 0) {
        throw new Error("A partner account with this email already exists");
      }

      const response = (await fetchFromHasura(partnerMutation, {
        object: {
          email,
          password,
          name: hotelName,
          store_name: hotelName,
          district: area,
          status: "inactive",
          upi_id: upiId,
          country,
          state,
          phone,
          description: "",
          role: "partner",
          location,
          geo_location: {
            type: "Point",
            coordinates: [geoLocation.longitude, geoLocation.latitude],
          },
        },
      })) as { insert_partners_one: Partner };

      if (!response?.insert_partners_one) {
        throw new Error("Failed to create partner account");
      }

      const newPartner = response.insert_partners_one;
      setAuthCookie({
        id: newPartner.id,
        role: "partner",
        feature_flags: newPartner.feature_flags || "",
        status: "inactive",
      });
      set({
        userData: { ...newPartner, role: "partner" },
        loading: false,
        features: getFeatures(newPartner?.feature_flags as string),
      });
    } catch (error) {
      throw error;
    }
  },

  signInPartnerWithEmail: async (email, password) => {
    try {
      await get().signOut();

      const response = (await fetchFromHasura(partnerLoginQuery, {
        email,
        password,
      })) as { partners: Partner[] };

      const partner = response?.partners?.[0];
      if (!partner) throw new Error("Invalid credentials");

      await setAuthCookie({
        id: partner.id,
        role: "partner",
        feature_flags: partner.feature_flags || "",
        status: partner.status || "inactive",
      });
      localStorage?.setItem("userId", partner.id);
      set({
        userData: { ...partner, role: "partner" },
        features: getFeatures(partner?.feature_flags as string),
      });

      addAccount({
        name: partner.store_name || "Guest",
        email: partner.email,
        store_name: partner.store_name || "Guest",
        role: "partner",
        id: partner.id,
        password: partner.password || "123456",
      });
    } catch (error) {
      throw error;
    }
  },

  signInWithPhone: async (phone, partnerId) => {
    try {
      await get().signOut();


      console.log("Signing in with phone:", phone, "Partner ID:", partnerId);
      

      const email = `${phone}@user.com`;
      const response = (await fetchFromHasura(userLoginQuery, { email })) as {
        users: User[];
      };

      let user: User;
      if (response?.users?.length > 0) {
        user = response.users[0];
      } else {
        const createResponse = (await fetchFromHasura(userLoginMutation, {
          object: {
            email,
            password: phone,
            full_name: `User${phone.slice(0, 5)}`,
            phone,
            crave_coins: 100,
            location: null,
            role: "user",
          },
        })) as { insert_users_one: User };

        if (!createResponse?.insert_users_one) {
          throw new Error("Failed to create user");
        }
        user = createResponse.insert_users_one;

        if (partnerId) {
          await sendRegistrationWhatsAppMsg(user.id, partnerId);
        } else {
          await sendRegistrationWhatsAppMsg(user.id);
        }
      }

      await transferTempDataToUserAccount(user.id);
      

      setAuthCookie({
        id: user.id,
        role: "user",
        feature_flags: "",
        status: "active",
      });
      localStorage?.setItem("userId", user.id);

      addAccount({
        name: user.phone || "Guest",
        email: user.phone,
        store_name: user.phone || "Guest",
        role: "user",
        id: user.id,
        password: user.phone,
      });

      set({ userData: { ...user, role: "user" } });
      return {
        ...user,
        role: "user",
      };
    } catch (error) {
      throw error;
    }
  },

  signInSuperAdminWithEmail: async (email, password) => {
    try {
            await get().signOut();


      const response = (await fetchFromHasura(superAdminLoginQuery, {
        email,
        password,
      })) as { super_admin: SuperAdmin[] };

      if (!response?.super_admin?.length) {
        throw new Error("Invalid email or password");
      }

      const superAdmin = response.super_admin[0];
      setAuthCookie({
        id: superAdmin.id,
        role: "superadmin",
        feature_flags: "",
        status: "active",
      });
      localStorage?.setItem("userId", superAdmin.id);
      addAccount({
        name: "Super Admin",
        email: superAdmin.email,
        store_name: "Super Admin",
        role: "superadmin",
        id: superAdmin.id,
        password: superAdmin.password || "123456",
      });
      set({ userData: { ...superAdmin, role: "superadmin" } });
    } catch (error) {
      throw error;
    }
  },

  signInCaptainWithEmail: async (email, password) => {
    try {
      await get().signOut();


      const response = await fetchFromHasura(
        `
        query LoginCaptain($email: String!, $password: String!) {
          captain(where: {email: {_eq: $email}, password: {_eq: $password}}) {
            id
            email
            partner_id
            role
            password
            name
          }
        }
      `,
        { email, password }
      );

      if (!response?.captain?.[0]) {
        throw new Error("Invalid email or password");
      }

      const captain = response.captain[0];

      const partnerResponse = await fetchFromHasura(
        `
        query GetPartnerData($partner_id: uuid!) {
          partners_by_pk(id: $partner_id) {
            id
            currency
            gst_percentage
            store_name
          }
        }
      `,
        { partner_id: captain.partner_id }
      );

      if (partnerResponse?.partners_by_pk) {
        const partnerData = partnerResponse.partners_by_pk;
        await setAuthCookie({
          id: captain.id,
          role: "captain",
          feature_flags: "",
          status: "active",
        });
        set({
          userData: {
            ...captain,
            role: "captain",
            currency: partnerData.currency || "₹",
            gst_percentage: partnerData.gst_percentage || 0,
            partner: partnerData,
          } as Captain,
        });
        addAccount({
          name: captain.name || "Captain",
          email: captain.email,
          store_name: captain.name || "Captain",
          role: "captain",
          id: captain.id,
          password: captain.password || "123456",
        });
      } else {
        await setAuthCookie({
          id: captain.id,
          role: "captain",
          feature_flags: "",
          status: "active",
        });
        set({
          userData: {
            ...captain,
            role: "captain",
            currency: "₹",
            gst_percentage: 0,
          } as Captain,
        });
        addAccount({
          name: captain.name || "Captain",
          email: captain.email,
          store_name: captain.name || "Captain",
          role: "captain",
          id: captain.id,
          password: captain.password || "123456",
        });
      }
    } catch (error) {
      throw error;
    }
  },

  setState: (updates) => {
    set((state) => ({
      ...state,
      userData: state.userData
        ? ({ ...state.userData, ...updates } as AuthUser)
        : null,
    }));
  },

  createPartner: async (
    hotelName,
    phone,
    upiId,
    area,
    location,
    email,
    password
  ) => {
    try {
      const existingPartner = await fetchFromHasura(partnerQuery, { email });
      if (existingPartner?.partners?.length > 0) {
        throw new Error("A partner account with this email already exists");
      }

      const response = (await fetchFromHasura(partnerMutation, {
        object: {
          email,
          password,
          name: hotelName,
          store_name: hotelName,
          location,
          district: area,
          status: "active",
          upi_id: upiId,
          phone,
          description: "",
          role: "partner",
        },
      })) as { insert_partners_one: Partner };

      if (!response?.insert_partners_one) {
        throw new Error("Failed to create partner account");
      }

      return response.insert_partners_one;
    } catch (error) {
      throw error;
    }
  },
}));