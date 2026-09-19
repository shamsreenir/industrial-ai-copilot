import React from 'react';
import { renderToString } from 'react-dom/server';

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

const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const fullUrl = (typeof url === 'string' && url.startsWith('/')) ? `http://127.0.0.1:8001${url}` : url;
  return nativeFetch(fullUrl, opts);
};

const views = [
  { name: '01. CommandCenterPage', path: './src/components/CommandCenterPage.jsx', api: '/api/overview', propName: 'overviewData' },
  { name: '02. DataStatusPage', path: './src/components/DataStatusPage.jsx' },
  { name: '03. RequirementsTraceabilityPage', path: './src/components/RequirementsTraceabilityPage.jsx' },
  { name: '04. VisualInspectionPage', path: './src/components/VisualInspectionPage.jsx' },
  { name: '05. DefectExplorerPage', path: './src/components/DefectExplorerPage.jsx' },
  { name: '06. EvidenceExplainabilityPage', path: './src/components/EvidenceExplainabilityPage.jsx' },
  { name: '07. BottleneckDetectionPage', path: './src/components/BottleneckDetectionPage.jsx' },
  { name: '08. ProductionFlowPage', path: './src/components/ProductionFlowPage.jsx' },
  { name: '09. QualityPage', path: './src/components/QualityPage.jsx' },
  { name: '10. RootCausePage', path: './src/components/RootCausePage.jsx' },
  { name: '11. BatchProcessDriftPage', path: './src/components/BatchProcessDriftPage.jsx' },
  { name: '12. IndustrialCopilotPage', path: './src/components/IndustrialCopilotPage.jsx' },
  { name: '13. WhatIfPage', path: './src/components/WhatIfPage.jsx' },
  { name: '14. EconomicsPage', path: './src/components/EconomicsPage.jsx' },
  { name: '15. ModelMonitoringPage', path: './src/components/ModelMonitoringPage.jsx' },
  { name: '16. DataQualityPage', path: './src/components/DataQualityPage.jsx' },
  { name: '17. RecommendationsPage', path: './src/components/RecommendationsPage.jsx' },
];

async function verifyAll() {
  console.log('--- STARTING 17-VIEW LIVE RENDERING TEST ---');
  let failures = 0;

  for (const v of views) {
    try {
      let data = null;
      if (v.api) {
        const res = await globalThis.fetch(`http://127.0.0.1:8001${v.api}`);
        if (!res.ok) throw new Error(`API ${v.api} failed with status ${res.status}`);
        data = await res.json();
      }

      const mod = await import(v.path);
      const Component = mod.default;
      const props = {
        onNavigate: () => {},
        onNavigateToTab: () => {},
        ...(v.propName && data ? { [v.propName]: data } : {})
      };

      const html = renderToString(React.createElement(Component, props));
      console.log(`[PASS] ${v.name}: Rendered ${html.length} characters`);
    } catch (err) {
      console.error(`[FAIL] ${v.name}:`, err.message || err);
      failures++;
    }
  }

  console.log(`--- TEST COMPLETE: ${views.length - failures}/${views.length} PASSED ---`);
  if (failures > 0) process.exit(1);
}

verifyAll();
