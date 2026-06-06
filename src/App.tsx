import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BillsProvider } from './context/BillsContext';
import { SettingsProvider } from './context/SettingsContext';
import { GoogleSheetsProvider } from './context/GoogleSheetsContext';
import Layout from './components/Layout/Layout';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import DashboardPage from './pages/DashboardPage';
import BillsPage from './pages/BillsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <SettingsProvider>
      <BillsProvider>
        <GoogleSheetsProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Layout>
              <Routes>
                <Route path="/" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                <Route path="/bills" element={<ErrorBoundary><BillsPage /></ErrorBoundary>} />
                <Route path="/analytics" element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
              </Routes>
            </Layout>
          </ErrorBoundary>
        </BrowserRouter>
        </GoogleSheetsProvider>
      </BillsProvider>
    </SettingsProvider>
  );
}
