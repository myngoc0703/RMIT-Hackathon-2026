// Realm role that lets a user run an artist studio. Assigning it on this IGA-enabled realm is a
// change request that realm admins approve in the Tide enclave, so nobody can make themselves an artist.
export const ARTIST_ROLE = process.env.NEXT_PUBLIC_ARTIST_ROLE || "artist";
