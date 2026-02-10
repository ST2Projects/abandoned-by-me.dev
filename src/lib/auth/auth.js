import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { building } from "$app/environment";
import { db } from "../database/drizzle.js";
import * as schema from "../database/schema.js";

let _auth;

function getAuth() {
  if (!_auth) {
    _auth = betterAuth({
      baseURL: process.env.BETTER_AUTH_URL,
      secret: process.env.BETTER_AUTH_SECRET,
      database: drizzleAdapter(db, {
        provider: "sqlite",
        schema,
      }),
      socialProviders: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          scope: ["read:user", "repo"],
        },
        ...(process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET
          ? {
              gitlab: {
                clientId: process.env.GITLAB_CLIENT_ID,
                clientSecret: process.env.GITLAB_CLIENT_SECRET,
                scope: ["read_user", "read_api"],
              },
            }
          : {}),
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
      },
    });
  }
  return _auth;
}

export const auth = building
  ? new Proxy(
      {},
      {
        get(_, prop) {
          throw new Error(`Cannot access auth.${String(prop)} during build`);
        },
      },
    )
  : new Proxy(
      {},
      {
        get(_, prop) {
          return getAuth()[prop];
        },
      },
    );
