// /app/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptText } from "./lib/encrtption";
import { cookies } from "next/headers";

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get("new_auth_token")?.value;
  const pathname = request.nextUrl.pathname;
  const cookieStore = await cookies();
  const requestHeaders = new Headers(request.headers);

  if (
    pathname.includes("/hotels") ||
    pathname.includes("/business") ||
    pathname.includes("/qrScan")
  ) {
    await cookieStore.set("pathname", pathname);
  }

  // Try to decrypt token early for captain guard
  let decrypted: { id: string; role: string; status?: string } | undefined;
  if (authToken) {
    try {
      decrypted = decryptText(authToken) as {
        id: string;
        role: string;
        status?: string;
      };
    } catch (e) {}
  }

  // CAPTAIN GUARD: Trap captain on /captain before public route check
  if (
    decrypted?.role === "captain" &&
    !(
      pathname === "/captain" ||
      pathname.startsWith("/kot/") ||
      pathname.startsWith("/bill/")
    )
  ) {
    return NextResponse.redirect(new URL("/captain", request.url));
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/signup",
    "/superLogin",
    "/hotels",
    "/partner",
    "/offers",
    "/explore",
    "/captainlogin",
    "/about-us",
    "/api/auth",
    "/captainlogin",
    "/partnerlogin",
    "/newlogin",
    "/demo",
  ];

  // if (
  //   pathname.startsWith("/qrScan/") ||
  //   pathname.startsWith("/hotels/") ||
  //   pathname.startsWith("/business/")
  // ) {
  //   await cookieStore.set("last_hotel", pathname.split("/").pop() || "");
  // }

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Handle root path redirects based on role
  if (pathname === "/") {
    try {
      let decrypted: { id: string; role: string; status?: string } | undefined;

      if (authToken) {
        decrypted = decryptText(authToken) as {
          id: string;
          role: string;
          status?: string;
        };
      }

      // Superadmin always redirects to /superadmin
      if (decrypted?.role === "superadmin") {
        return NextResponse.redirect(new URL("/superadmin", request.url));
      }

      // Partner redirects to /admin
      if (decrypted?.role === "partner") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }

      // For users, redirect to their last visited hotel only on an initial page load.
      // This is determined by checking the 'Referer' header.
      const referer = request.headers.get("referer");
      const requestHost = request.nextUrl.host;
      let isInternalNavigation = false;

      // Safely check if the referer is from the same host.
      // This prevents "Invalid URL" errors if the referer is missing or malformed.
      if (referer) {
        try {
          const refererHost = new URL(referer).host;
          isInternalNavigation = refererHost === requestHost;
        } catch {
          // If referer is not a valid URL, treat it as external.
          isInternalNavigation = false;
        }
      }

      // const lastHotel = cookieStore.get("last_hotel")?.value;

      // if (
      //   decrypted?.role !== "partner" &&
      //   decrypted?.role !== "superadmin" &&
      //   lastHotel &&
      //   !isInternalNavigation
      // ) {
      //   return NextResponse.redirect(
      //     new URL(`/hotels/${lastHotel}`, request.url)
      //   );
      // }

      // Regular users stay on home page
      return NextResponse.next();
    } catch (error) {
      console.error("Error in root path handler:", error);
      // Continue with normal flow if there's an error
    }
    return NextResponse.next();
  }

  // Route access rules by role
  const roleAccessRules = {
    user: {
      allowed: ["/profile", "/my-orders"],
      redirect: "/",
    },
    partner: {
      allowed: [
        "/admin",
        "/partner",
        "/profile",
        "/admin/orders",
        "/admin/captain-management",
      ],
      redirect: "/",
    },
    superadmin: {
      allowed: [
        "/superadmin",
        "/admin",
        "/profile",
        "/superadmin/create-partner",
      ],
      redirect: "/",
    },
    captain: {
      allowed: ["/captain", "/captain/pos"],
      redirect: "/",
    },
  };

  // Allowed routes for inactive partners (exact matches only)
  const inactivePartnerAllowedRoutes = [
    "/admin", // Only exact match, not /admin/*
    "/profile",
    "/offers",
    "/explore",
    "/",
    "/login",
    "/partner",
  ];

  // Check if trying to access a protected route
  const isProtectedRoute =
    Object.values(roleAccessRules).some((rule) =>
      rule.allowed.some((route) => pathname.startsWith(route))
    ) || inactivePartnerAllowedRoutes.includes(pathname);

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // If no auth token, redirect based on the route
  if (!authToken) {
    const isSuperadminRoute = pathname.startsWith("/superadmin");
    const redirectPath = isSuperadminRoute ? "/" : "/";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  try {
    const decrypted = decryptText(authToken) as {
      id: string;
      role: string;
      status?: string;
    };

    if (!decrypted?.id || !decrypted?.role) {
      throw new Error("Invalid token structure");
    }

    // Captain route guard: trap captain on /captain
    if (decrypted.role === "captain") {
      // Allow only the exact /captain path
      if (pathname !== "/captain") {
        return NextResponse.redirect(new URL("/captain", request.url));
      }
    }

    const userRole = decrypted.role as keyof typeof roleAccessRules;
    const userRules = roleAccessRules[userRole] || roleAccessRules.user;

    // Special handling for inactive partners
    if (userRole === "partner" && decrypted.status === "inactive") {
      // For inactive partners, only allow exact matches to the allowed routes
      const isAllowedRoute = inactivePartnerAllowedRoutes.includes(pathname);

      // Special case: allow /admin but not /admin/*
      if (
        pathname.startsWith("/admin/") ||
        (pathname === "/admin" && !isAllowedRoute)
      ) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }

      if (!isAllowedRoute) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    } else {
      // Normal role-based access check for active users
      const hasAccess = userRules.allowed.some((route) =>
        pathname.startsWith(route)
      );
      if (!hasAccess) {
        return NextResponse.redirect(new URL(userRules.redirect, request.url));
      }
    }

    // Add user info to headers

    requestHeaders.set("x-user-id", decrypted.id);
    requestHeaders.set("x-user-role", decrypted.role);
    if (decrypted.status) {
      requestHeaders.set("x-user-status", decrypted.status);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("Auth verification failed:", error);
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("new_auth_token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (image files)
     * - api/auth (auth API routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)",
  ],
};
