export type SignInCode = { email: string; code: string };

/** How a sign-in code reaches a person. No mail provider is chosen yet, so only the dev stand-in exists. */
export type SignInCodeMailer = {
  sendSignInCode: (message: SignInCode) => Promise<void>;
};

/** Dev only: prints the code where the developer can read it. Never use where logs are kept. */
export function createConsoleMailer(write: (line: string) => void): SignInCodeMailer {
  return {
    sendSignInCode: async ({ email, code }) => {
      write(`[dev mailer] sign-in code for ${email}: ${code}`);
    },
  };
}
