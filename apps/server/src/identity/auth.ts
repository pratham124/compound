import { EMAIL_CODE_LENGTH } from "@compound/contracts";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import type { Redis } from "ioredis";
import type pg from "pg";

import type { Config } from "../config.ts";
import type { SignInCodeMailer } from "./mailer.ts";
import { uuidv7 } from "./uuidv7.ts";
import { valkeyStorage } from "./valkeyStorage.ts";

const CODE_LIFETIME_SECONDS = 300;
const CODE_ATTEMPTS = 5;

export type CreateAuthOptions = {
  pool: pg.Pool;
  valkey: Redis;
  config: Pick<Config, "authSecret" | "authBaseUrl" | "appleBundleId">;
  mailer: SignInCodeMailer;
};

/** Nothing here knows about the phone, so the AI assistant consent page can sign people in through the same routes. */
export function createAuth({
  pool,
  valkey,
  config,
  mailer,
}: CreateAuthOptions) {
  return betterAuth({
    baseURL: config.authBaseUrl,
    secret: config.authSecret,
    database: pool,
    // With this set and no cookie cache, every request looks the session token up in Valkey.
    secondaryStorage: valkeyStorage(valkey),
    trustedOrigins: ["compound://"],
    // Off by default outside production; counters go to Valkey because secondaryStorage is set.
    rateLimit: { enabled: true },
    advanced: { database: { generateId: () => uuidv7() } },
    user: {
      modelName: "users",
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    account: {
      modelName: "accounts",
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    socialProviders: {
      apple: {
        clientId: config.appleBundleId,
        appBundleIdentifier: config.appleBundleId,
      },
    },
    plugins: [
      expo(),
      emailOTP({
        otpLength: EMAIL_CODE_LENGTH,
        expiresIn: CODE_LIFETIME_SECONDS,
        allowedAttempts: CODE_ATTEMPTS,
        storeOTP: "hashed",
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type !== "sign-in") {
            throw new Error(`Unsupported code type: ${type}`);
          }

          await mailer.sendSignInCode({ email, code: otp });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
