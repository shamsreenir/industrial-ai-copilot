import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock browser globals if needed
globalThis.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: () => {},
  removeEventListener: () => {},
  matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
};
globalThis.document = {
  createElement: () => ({ getContext: () => null }),
  addEventListener: () => {},
  removeEventListener: () => {},
};

async function testAll() {
  const components = [
    { name: 'App', path: './src/App.jsx' },
    { name: 'CommandCenterPage', path: './src/components/CommandCenterPage.jsx', props: { overviewData: {} } },
    { name: 'DataStatusPage', path: './src/components/DataStatusPage.jsx' },
    { name: 'RequirementsTraceabilityPage', path: './src/components/RequirementsTraceabilityPage.jsx' },
    { name: 'VisualInspectionPage', path: './src/components/VisualInspectionPage.jsx' },
    { name: 'DefectExplorerPage', path: './src/components/DefectExplorerPage.jsx' },
    { name: 'EvidenceExplainabilityPage', path: './src/components/EvidenceExplainabilityPage.jsx' },
    { name: 'BottleneckDetectionPage', path: './src/components/BottleneckDetectionPage.jsx' },
    { name: 'ProductionFlowPage', path: './src/components/ProductionFlowPage.jsx' },
    { name: 'QualityPage', path: './src/components/QualityPage.jsx' },
    { name: 'RootCausePage', path: './src/components/RootCausePage.jsx' },
    { name: 'BatchProcessDriftPage', path: './src/components/BatchProcessDriftPage.jsx' },
    { name: 'IndustrialCopilotPage', path: './src/components/IndustrialCopilotPage.jsx' },
    { name: 'WhatIfPage', path: './src/components/WhatIfPage.jsx' },
    { name: 'EconomicsPage', path: './src/components/EconomicsPage.jsx' },
    { name: 'ModelMonitoringPage', path: './src/components/ModelMonitoringPage.jsx' },
    { name: 'DataQualityPage', path: './src/components/DataQualityPage.jsx' },
    { name: 'RecommendationsPage', path: './src/components/RecommendationsPage.jsx' },
    { name: 'Sidebar', path: './src/components/Sidebar.jsx', props: { activeTab: 'overview' } },
    { name: 'Navbar', path: './src/components/Navbar.jsx', props: { activeTab: 'overview' } },
    { name: 'DecisionChain', path: './src/components/DecisionChain.jsx', props: { activeTab: 'overview' } },
  ];

  for (const comp of components) {
    try {
      const mod = await import(comp.path);
      const Component = mod.default;
      if (!Component) {
        console.error(`FAILED: ${comp.name} has no default export!`);
        continue;
      }
      const html = renderToString(React.createElement(Component, comp.props || {}));
      console.log(`PASS: ${comp.name} rendered successfully (${html.length} chars)`);
    } catch (err) {
      console.error(`ERROR rendering ${comp.name}:`, err);
    }
  }
}

testAll();
