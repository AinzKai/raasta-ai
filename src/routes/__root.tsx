import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/integrations/supabase/config";
import { Toaster } from "@/components/ui/sonner";
import { initSentry, captureError } from "@/lib/sentry";
import { useLang } from "@/lib/i18n";
import { MobileNav } from "@/components/MobileNav";
import { OfflineBanner, registerServiceWorker } from "@/lib/pwa";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-primary">404</h1>
        <h2 className="mt-4 text-xl font-bold">This page doesn't exist</h2>
        <p className="mt-2 text-sm text-muted">
          The page you're looking for has moved or was never here.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  captureError(error);
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted">
          Something went wrong on our side. Try again, or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-2xl bg-surface px-5 py-3 text-sm font-semibold ring-1 ring-line transition-shadow hover:shadow-lift"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#125e40" },
      { title: "Raasta — Your path through Pakistan's civic services" },
      {
        name: "description",
        content: "Turn confusing civic procedures into verified, step-by-step journeys.",
      },
      { name: "application-name", content: "Raasta" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Raasta" },
      { property: "og:site_name", content: "Raasta" },
      { property: "og:title", content: "Raasta — Your path through Pakistan's civic services" },
      {
        property: "og:description",
        content: "Turn confusing civic procedures into verified, step-by-step journeys.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icon-512.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Raasta — Your path through Pakistan's civic services" },
      {
        name: "twitter:description",
        content: "Turn confusing civic procedures into verified, step-by-step journeys.",
      },
      { name: "twitter:image", content: "/icon-512.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;600&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [lang] = useLang();

  useEffect(() => {
    initSentry();

    const handler = (event: PromiseRejectionEvent) => captureError(event.reason);
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "ur" ? "ur" : lang === "roman" ? "ur-Latn" : "en";
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <OfflineBanner />
        <main id="main" className="flex-1 pb-28 md:pb-0">
          <Outlet />
        </main>
        <SiteFooter />
        <MobileNav />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
