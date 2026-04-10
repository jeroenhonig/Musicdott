import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

const FallbackComponent = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
    <h1 className="text-2xl font-bold text-gray-800">Er is iets misgegaan</h1>
    <p className="text-gray-500">
      Het probleem is automatisch gemeld. Vernieuw de pagina om opnieuw te proberen.
    </p>
    <button
      className="px-4 py-2 bg-[#1B2B6B] text-white rounded-lg text-sm"
      onClick={() => window.location.reload()}
    >
      Pagina vernieuwen
    </button>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<FallbackComponent />}>
    <App />
  </Sentry.ErrorBoundary>
);
