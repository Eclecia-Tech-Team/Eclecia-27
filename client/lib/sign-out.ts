"use client";

import { signOut } from "next-auth/react";
import { curtainNavigate } from "./route-curtain";

/**
 * Sign out and transition smoothly to the home page using the route curtain animation.
 */
export async function signOutHome() {
  await curtainNavigate("/", async () => {
    await signOut({ redirect: false });
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  });
}
