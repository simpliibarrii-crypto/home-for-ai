import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PushNotificationToast } from "@/components/PushNotificationToast";
import WorkshopPage from "@/pages/Workshop";
import ChatPage from "@/pages/Chat";
import PortfolioPage from "@/pages/Portfolio";
import MarketPage from "@/pages/Market";
import SettingsPage from "@/pages/Settings";
import TradePage from "@/pages/Trade";
import WalletPage from "@/pages/Wallet";
import ConvertPage from "@/pages/Convert";
import AuthPage from "@/pages/Auth";
import CeoLoginPage from "@/pages/CeoLogin";
import CeoDashboard from "@/pages/CeoDashboard";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router hook={useHashLocation}>
            <Switch>
              {/* Auth page — standalone, no Layout wrapper */}
              <Route path="/auth" component={AuthPage} />

              {/* CEO pages — standalone, no Layout wrapper, not in nav */}
              <Route path="/ceo" component={CeoLoginPage} />
              <Route path="/ceo/dashboard" component={CeoDashboard} />

              {/* All other routes inside Layout */}
              <Route>
                <Layout>
                  <Switch>
                    <Route path="/" component={WorkshopPage} />
                    <Route path="/chat" component={ChatPage} />
                    <Route path="/portfolio" component={PortfolioPage} />
                    <Route path="/market" component={MarketPage} />
                    <Route path="/settings" component={SettingsPage} />
                    <Route path="/trade" component={TradePage} />
                    <Route path="/wallet" component={WalletPage} />
                    <Route path="/convert" component={ConvertPage} />
                    <Route component={NotFound} />
                  </Switch>
                </Layout>
              </Route>
            </Switch>
          </Router>
          <Toaster />
          {/* Push notification opt-in toast — shown once after login */}
          <PushNotificationToast />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
