/**
 * Minimal structured logger.
 *
 * Keeps a single, dependency-free logging surface so the rest of the app
 * never calls console.* directly. Emits JSON lines in production (easy to
 * ingest in Vercel logs) and pretty lines in development.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function write(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
) {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === "production") {
    const payload = JSON.stringify({ timestamp, level, message, ...context });
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](payload);
    return;
  }

  const prefix = `[${timestamp}] ${level.toUpperCase()}`;
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](
    prefix,
    message,
    context ? context : ""
  );
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    write("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    write("error", message, context),
};
