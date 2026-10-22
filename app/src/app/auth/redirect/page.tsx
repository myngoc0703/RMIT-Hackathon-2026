"use client";

import { useAuthCallback } from "@tidecloak/nextjs";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/client";

// Post-auth redirect handler (I-16).
// Processes the OIDC callback, then redirects:
//   - On success: to returnUrl (where user was before login) or home
//   - On error or missing verifier: back to home
//
// Separated so useAuthCallback only runs after hydration (avoids SSR window error).
function RedirectHandler() {
  const { isProcessing, isSuccess, error } = useAuthCallback({
    onSuccess: (returnUrl) => {
      window.location.assign(returnUrl || "/");
    },
    onError: () => {
      window.location.assign("/");
    },
    onMissingVerifierRedirectTo: "/",
  });

  useEffect(() => {
    // Direct navigation without callback params — redirect to home.
    const params = new URLSearchParams(window.location.search);
    if (!params.has("code") && !params.has("error")) {
      window.location.assign("/");
    }
  }, []);

  if (error) {
    return <p>Authentication failed: {error.message}</p>;
  }

  if (isProcessing || !isSuccess) {
    return <p>Completing login...</p>;
  }

  return <p>Redirecting...</p>;
}

export default function AuthRedirectPage() {
  const [mounted, setMounted] = useState(false);
  const { guest, isInitializing } = useAuth();
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (guest) window.location.assign("/");
  }, [guest]);
  // Wait until the Tide adapter has loaded, so useAuthCallback runs inside TideCloakProvider.
  if (!mounted || guest || isInitializing) return <p>Loading...</p>;
  return <RedirectHandler />;
}
