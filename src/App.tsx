import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { recordView } from "./lib/usageMetrics";
import ErrorBoundary from "@/components/ErrorBoundary";
import PrivacyNotice from "@/components/privacy/PrivacyNotice";
import Index from "./pages/Index";
import HelpPage from "./pages/HelpPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const PageViewTracker = () => {
  const location = useLocation();
  useEffect(() => {
    recordView(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PageViewTracker />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/help" element={<HelpPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ErrorBoundary logLabel="PrivacyNotice" fallback={null}>
          <PrivacyNotice />
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
