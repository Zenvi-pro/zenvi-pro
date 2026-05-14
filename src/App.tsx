import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Download from "./pages/Download";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthSuccess from "./pages/AuthSuccess";
import AuthCallback from "./pages/AuthCallback";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import DashboardUsage from "./pages/Dashboard";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import DocsLayout from "./components/docs/DocsLayout";
import DocsHome from "./pages/DocsHome";
import DocsPage from "./pages/DocsPage";
import PricingPage from "./pages/PricingPage";
import DashboardLayout from "./components/dashboard/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/docs" element={<DocsLayout />}>
            <Route index element={<DocsHome />} />
            <Route path=":slug" element={<DocsPage />} />
          </Route>

          {/* Dashboard with nested subpages */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard/download" replace />} />
            <Route path="download" element={<Download />} />
            <Route path="usage" element={<DashboardUsage />} />
          </Route>

          {/* Legacy /download redirect into dashboard */}
          <Route path="/download" element={<Navigate to="/dashboard/download" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
