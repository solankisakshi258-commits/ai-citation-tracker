/**
 * Centralized, validated access to environment variables.
 *
 * Service modules read from here so a missing key fails loudly with a clear
 * message instead of producing a confusing API error deeper in the stack.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to your .env file (see .env.example).`
    );
  }
  return value;
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get SERPAPI_API_KEY() {
    return required("SERPAPI_API_KEY");
  },
  get DATAFORSEO_LOGIN() {
    return required("DATAFORSEO_LOGIN");
  },
  get DATAFORSEO_PASSWORD() {
    return required("DATAFORSEO_PASSWORD");
  },
  get CRON_SECRET() {
    return process.env.CRON_SECRET ?? "";
  },
};
