"use client";

import { signOut } from "next-auth/react";

/**
 * Sign out and land on the home page. Not signOut({ callbackUrl: "/" }):
 * auth.ts's redirect callback sends "/" to /profile (right after sign-in,
 * wrong after sign-out), which then bounces to /login.
 */
export async function signOutHome() {
  await signOut({ redirect: false });
  // A full load on purpose: drops every bit of signed-in client state.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/");
}
