import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { recordView } from "./lib/usageMetrics";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/theme-provider";
import PrivacyNotice from "@/components/privacy/PrivacyNotice";
import SeoHead from "@/components/SeoHead";
import Index from "./pages/Index";
import InServicePage from "./pages/InServicePage";
import HelpPage from "./pages/HelpPage";
import NotFound from "./pages/NotFound";

export const PageViewTracker = () => {
  const location = useLocation();
  const firstRender = useRef(true);
  useEffect(() => {
    // gtag("config") records the initial load, including when consent is
    // granted after React mounts. Only subsequent SPA navigations are manual.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    recordView(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
};

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>;
};

export const AppContent = ({ trackPageViews = true }: { trackPageViews?: boolean }) => (
  <>
    <Toaster />
    <Sonner />
    <SeoHead />
    {trackPageViews && <PageViewTracker />}
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/in-service" element={<InServicePage />} />
      <Route path="/help" element={<HelpPage />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    <ErrorBoundary logLabel="PrivacyNotice" fallback={null}>
      <PrivacyNotice />
    </ErrorBoundary>
  </>
);

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </AppProviders>
);

export default App;
