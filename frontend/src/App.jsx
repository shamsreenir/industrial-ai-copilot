import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import VisualInspectionPage from './components/VisualInspectionPage';
import DefectExplorerPage from './components/DefectExplorerPage';
import RootCausePage from './components/RootCausePage';
import EvidenceExplainabilityPage from './components/EvidenceExplainabilityPage';
import RequirementsTraceabilityPage from './components/RequirementsTraceabilityPage';
import VisionExtensionModal from './components/VisionExtensionModal';
import DecisionChain from './components/DecisionChain';
import IndustrialCanvasBackground from './components/ui/IndustrialCanvasBackground';
import ViewErrorBoundary from './components/ui/ViewErrorBoundary';
import { InspectionProvider } from './context/InspectionContext';

function AppContent({ defaultTab } = {}) {
  const [activeTab, setActiveTab] = useState(() => {
    if (defaultTab) return defaultTab;
    if (typeof window !== 'undefined' && window.location?.hash) {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash) return hash;
    }
    return 'inspection';
  });
  const [overviewData, setOverviewData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);

  // Sync hash navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHashChange = () => {
      const hash = window.location.hash?.replace('#', '').trim();
      if (hash) setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when activeTab changes
  const navigateToTab = (tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
  };

  // Load initial command center overview
  useEffect(() => {
    fetch('/api/overview')
      .then(res => res.json())
      .then(data => setOverviewData(data))
      .catch(err => console.error("Error fetching overview:", err));
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-cyan-500 selection:text-slate-950 relative">
      {/* Ambient 60fps Telemetry Particles */}
      <IndustrialCanvasBackground />

      {/* Primary Industrial Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Command Ribbon */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={navigateToTab}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenVisionModal={() => setIsVisionModalOpen(true)}
          healthScore={overviewData?.system_health_score || 88.5}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Visual Interactive Industrial Decision Chain */}
          <DecisionChain activeTab={activeTab} onNavigate={navigateToTab} />

          {/* View 01: Visual Inspection & Human Scrutiny Workstation */}
          {(activeTab === 'inspection' || activeTab === 'vision') && (
            <ViewErrorBoundary viewName="Visual Inspection Studio">
              <VisualInspectionPage onNavigateToTab={navigateToTab} />
            </ViewErrorBoundary>
          )}

          {/* View 02: Benchmark Evaluation & Classification Metrics */}
          {(activeTab === 'evaluation' || activeTab === 'defect_explorer') && (
            <ViewErrorBoundary viewName="Benchmark & Evaluation">
              <DefectExplorerPage initialDataset="organizer" onNavigateToTab={navigateToTab} />
            </ViewErrorBoundary>
          )}

          {/* View 03: Spatial Evidence & Optical Robustness */}
          {activeTab === 'explainability' && (
            <ViewErrorBoundary viewName="Evidence & Explainability">
              <EvidenceExplainabilityPage onNavigateToTab={navigateToTab} />
            </ViewErrorBoundary>
          )}

          {/* View 04: Process Root Cause, SHAP & Drift Evidence */}
          {(activeTab === 'rootcause' || activeTab === 'drift') && (
            <ViewErrorBoundary viewName="Process Root Cause & Drift">
              <RootCausePage onNavigateToTab={navigateToTab} />
            </ViewErrorBoundary>
          )}

          {/* View 05: Secondary NEU-DET YOLO Localization Benchmark */}
          {activeTab === 'secondary_benchmark' && (
            <ViewErrorBoundary viewName="Secondary NEU-DET Benchmark">
              <DefectExplorerPage initialDataset="neu_det" onNavigateToTab={navigateToTab} />
            </ViewErrorBoundary>
          )}

          {/* Requirements Traceability & Compliance */}
          {activeTab === 'traceability' && (
            <ViewErrorBoundary viewName="Requirements Traceability">
              <RequirementsTraceabilityPage onNavigateToTab={navigateToTab} />
            </ViewErrorBoundary>
          )}

          {/* Default Fallback to Visual Inspection Studio */}
          {![
            'inspection', 'vision', 'evaluation', 'defect_explorer', 
            'explainability', 'rootcause', 'drift', 'secondary_benchmark', 'traceability'
          ].includes(activeTab) && (
            <ViewErrorBoundary viewName="Visual Inspection Studio">
              <VisualInspectionPage onNavigateToTab={navigateToTab} />
            </ViewErrorBoundary>
          )}
        </main>

        {/* Global Industrial Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/90 py-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              NEURAX HACKATHON 3.0 • Domain 2: AI in Industry & Automation • INDUSTRIAL AI COPILOT
            </div>
            <div className="font-mono text-[11px] text-slate-600">
              Advisory Decision Support • Rockwell Arena Model 3 (605k rows) • Zero Hallucination Mode
            </div>
          </div>
        </footer>
      </div>

      {/* Modular Vision Architecture Modal */}
      <VisionExtensionModal
        isOpen={isVisionModalOpen}
        onClose={() => setIsVisionModalOpen(false)}
      />
    </div>
  );
}

export default function App(props) {
  return (
    <InspectionProvider>
      <AppContent {...props} />
    </InspectionProvider>
  );
}
