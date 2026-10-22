# Where TideCloak protects W2W

Planned with Tide's MCP (Raziel). It matches W2W to Tide's `iga-admin-governance` pattern with the
`add-auth-nextjs-fresh`, `protect-api-nextjs`, `verify-jwt-server-side` and `add-rbac-nextjs` playbooks.

W2W runs in one of two modes, chosen by `W2W_AUTH_MODE` in `app/.env`:

- `simulated` (default): a local stand-in for TideCloak, so every flow below runs end to end without the Tide network.
- `tide`: the real TideCloak realm (`npm run init`, then `data/tidecloak.json`).

The app code is the same in both modes. Pages use one hook (`useAuth`), and API routes use one set of
guards (`withAuth`, `withVerified`, `optionalAuth`).

| W2W feature | Real TideCloak | Simulated now |
|---|---|---|
| Sign in / create account | Tide account (PRISM, threshold keys), brokered by TideCloak | `/sim/login`: username and password, scrypt-hashed, in memory |
| Passkey after sign-in | TideCloak post-login flow `wavetowin-passkey` (WebAuthn) | Passkey step: a one-time sign-in ticket is exchanged for a token |
| Access token | Signed by the realm's threshold VVK; claims `sub`, `preferred_username`, `realm_access.roles`, `vuid`, `tideuserkey` | Same claims, signed with a local ES256 key |
| Token check on every protected API | `verifyTideJWT` (embedded JWKS) + DPoP proof | `verifySimToken`: signature, issuer, audience, `azp`, expiry. DPoP not simulated |
| Second factor: email code | Gmail code bound to the token's `sub` | Same check; shown in a simulated inbox when Gmail isn't set up |
| Member vs visitor | Valid token + verified email | Same |
| Artist (owner) | Ownership bound to the uploader's Tide `sub` | Same, bound to the simulated `sub` |
| Licensed collector | Per-artwork approval by the owner's identity | Same |
| Leak tracing | Viewer names come from verified tokens | Same |
| Account and role governance | IGA change requests, quorum-signed in the Tide enclave | Not simulated: the app has no admin role |
| Originals encrypted end to end (next step) | `RelationshipAttestation:1` policies, decrypt only for approved collectors | Not simulated: originals are served only to the owner and approved collectors |

To switch to the real TideCloak: set `W2W_AUTH_MODE=tide`, run `npm run init`, finish the invite,
and restart `npm run dev`. Nothing else changes.
