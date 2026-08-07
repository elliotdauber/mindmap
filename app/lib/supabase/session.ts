import type { SerializeOptions } from "cookie";

/** Keep signed-in users on this device for seven days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const sessionCookieOptions: SerializeOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

type CookieToSet = {
  name: string;
  value: string;
  options: SerializeOptions;
};

/** Apply the week-long session lifetime whenever auth cookies are written. */
export function stampSessionCookies(cookies: CookieToSet[]): CookieToSet[] {
  return cookies.map(({ name, value, options }) => ({
    name,
    value,
    options: {
      ...options,
      ...sessionCookieOptions,
      maxAge: value ? SESSION_MAX_AGE_SECONDS : 0,
    },
  }));
}
