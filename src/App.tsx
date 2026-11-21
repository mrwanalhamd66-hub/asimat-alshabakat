import { X } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { LiveChatWidget } from './components/LiveChatWidget.tsx';
import { OfflineIndicator } from './components/PWAInstallPrompt.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { OffersPage } from './pages/OffersPage.tsx';
import { TrackingPage } from './pages/TrackingPage.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { SmartPlannerPage } from './pages/SmartPlannerPage.tsx';
import { SmartAssistantPage } from './pages/SmartAssistantPage.tsx';
import { AcademyPage } from './pages/AcademyPage.tsx';
import { CommunityAndLabPage } from './pages/CommunityAndLabPage.tsx';
import { MarketIndexPage } from './pages/MarketIndexPage.tsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.tsx';

function MainRouter() {
  const { route, authError, clearAuthError } = useApp();
  const pathname = route.split('?')[0] || '/';

  const renderPage = () => {
    if (pathname.startsWith('/admin')) return <AdminDashboard />;
    if (pathname.startsWith('/catalog')) return <CatalogPage />;
    if (pathname.startsWith('/offers')) return <OffersPage />;
    if (pathname.startsWith('/track')) return <TrackingPage />;
    if (pathname.startsWith('/account')) return <AccountPage />;
    if (pathname.startsWith('/planner')) return <SmartPlannerPage />;
    if (pathname.startsWith('/assistant')) return <SmartAssistantPage />;
    if (pathname.startsWith('/academy')) return <AcademyPage />;
    if (pathname.startsWith('/community')) return <CommunityAndLabPage />;
    if (pathname.startsWith('/market')) return <MarketIndexPage />;
    return <HomePage />;
  };

  const showGlobalAuthNotice =
    Boolean(authError) && !pathname.startsWith('/account') && !pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F7] dark:bg-[#0E0E10] text-[#0E0E10] dark:text-neutral-100 transition-colors">
      <Header />
      {showGlobalAuthNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
            <span>{authError}</span>
            <button
              type="button"
              onClick={clearAuthError}
              className="text-amber-700 dark:text-amber-300 hover:text-amber-950 shrink-0 cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <main className="flex-1">{renderPage()}</main>
      <Footer />
      <ProductDetailModal />
      <CartDrawer />
      <LiveChatWidget />
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainRouter />
      </AppProvider>
    </ErrorBoundary>
  );
}
