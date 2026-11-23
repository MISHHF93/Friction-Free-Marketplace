export type ErrorReporterContext = Record<string, unknown>;
export type ErrorReporter = (error: unknown, context?: ErrorReporterContext) => void;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    const digest = "digest" in error ? (error as Error & { digest?: string }).digest : undefined;
    return { name: error.name, message: error.message, digest };
  }
  return { name: "Error", message: String(error) };
}

const defaultReporter: ErrorReporter = (error, context) => {
  console.error(JSON.stringify({
    type: "app_error",
    ...serializeError(error),
    context: context ?? {},
    at: new Date().toISOString()
  }));
};

let reporter: ErrorReporter = defaultReporter;

export function setErrorReporter(next: ErrorReporter | null) {
  reporter = next ?? defaultReporter;
}

export function reportError(error: unknown, context?: ErrorReporterContext) {
  try {
    reporter(error, context);
  } catch {
    defaultReporter(error, context);
  }
}
