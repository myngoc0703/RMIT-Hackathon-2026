"use client";

import { useTideCloak } from "@tidecloak/nextjs";
import { useCallback } from "react";

// Signed in: every call goes through secureFetch, so it carries the DPoP-bound Tide token.
// Signed out: plain fetch, which public routes accept and protected routes refuse.
// secureFetch builds the DPoP proof from the URL, so it gets an absolute one.
export function useApi() {
  const { authenticated, secureFetch } = useTideCloak();
  return useCallback(
    (path: string, init?: RequestInit) => {
      const url = new URL(path, window.location.origin).toString();
      return authenticated ? secureFetch(url, init) : fetch(url, init);
    },
    [authenticated, secureFetch]
  );
}
