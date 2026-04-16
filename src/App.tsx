import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import WheelTrackerPage from "@/pages/WheelTrackerPage";
import CampaignTrackerPage from "@/pages/CampaignTrackerPage";
import CondorTrackerPage from "@/pages/CondorTrackerPage";
import CapitalTrackerPage from "@/pages/CapitalTrackerPage";
import InstrumentMasterPage from "@/pages/InstrumentMasterPage";
import ProvidersPage from "@/pages/ProvidersPage";
import PositionsPage from "@/pages/PositionsPage";
import TradesPage from "@/pages/TradesPage";
import StrategiesPage from "@/pages/StrategiesPage";
import RiskPage from "@/pages/RiskPage";
import MarginPage from "@/pages/MarginPage";
import PerformancePage from "@/pages/PerformancePage";
import IncomePage from "@/pages/IncomePage";
import ImportsPage from "@/pages/ImportsPage";
import SourcesPage from "@/pages/SourcesPage";
import ParserConfigPage from "@/pages/ParserConfigPage";
import MappingRulesPage from "@/pages/MappingRulesPage";
import ReportsPage from "@/pages/ReportsPage";
import AuditLogPage from "@/pages/AuditLogPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import CampaignsPage from "@/pages/CampaignsPage";
import ResearchPage from "@/pages/ResearchPage";
import DataQualityPage from "@/pages/DataQualityPage";
import AnalyticsCatalogPage from "@/pages/AnalyticsCatalogPage";
import ExternalDataPage from "@/pages/ExternalDataPage";
import LiquiditySectorsPage from "@/pages/LiquiditySectorsPage";
import StressTestingPage from "@/pages/StressTestingPage";
import ComparisonLabPage from "@/pages/ComparisonLabPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/wheel-tracker" element={<WheelTrackerPage />} />
              <Route path="/campaigns" element={<CampaignTrackerPage />} />
              <Route path="/condor-tracker" element={<CondorTrackerPage />} />
              <Route path="/capital" element={<CapitalTrackerPage />} />
              <Route path="/instruments" element={<InstrumentMasterPage />} />
              <Route path="/liquidity" element={<LiquiditySectorsPage />} />
              <Route path="/stress" element={<StressTestingPage />} />
              <Route path="/comparison" element={<ComparisonLabPage />} />
              <Route path="/providers" element={<ProvidersPage />} />
              <Route path="/positions" element={<PositionsPage />} />
              <Route path="/trades" element={<TradesPage />} />
              <Route path="/strategies" element={<StrategiesPage />} />
              <Route path="/risk" element={<RiskPage />} />
              <Route path="/margin" element={<MarginPage />} />
              <Route path="/performance" element={<PerformancePage />} />
              <Route path="/income" element={<IncomePage />} />
              <Route path="/imports" element={<ImportsPage />} />
              <Route path="/sources" element={<SourcesPage />} />
              <Route path="/parser-config" element={<ParserConfigPage />} />
              <Route path="/mapping-rules" element={<MappingRulesPage />} />
              <Route path="/external-data" element={<ExternalDataPage />} />
              <Route path="/data-quality" element={<DataQualityPage />} />
              <Route path="/analytics-catalog" element={<AnalyticsCatalogPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/audit-log" element={<AuditLogPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
