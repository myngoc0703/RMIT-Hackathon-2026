// Which identity provider protects W2W.
// "simulated" (default): a local stand-in for TideCloak that issues TideCloak-shaped signed tokens,
//   so sign-in, roles and server-side access checks run end to end without the Tide network.
// "tide": the real TideCloak (needs data/tidecloak.json from `npm run init`).
export const AUTH_MODE: "simulated" | "tide" = process.env.W2W_AUTH_MODE === "tide" ? "tide" : "simulated";
export const SIMULATED_TIDE = AUTH_MODE === "simulated";
