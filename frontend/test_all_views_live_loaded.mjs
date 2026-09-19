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

// Test configurations with live endpoints to populate state
const tests = [
  {
    id: 'overview',
    name: '01. CommandCenterPage',
    componentPath: './src/components/CommandCenterPage.jsx',
    api: '/api/overview',
    expected: 'Operational Executive Command Center',
    makeProps: (data) => ({ overviewData: data, onNavigate: () => {} })
  },
  {
    id: 'setup',
    name: '02. DataStatusPage',
    componentPath: './src/components/DataStatusPage.jsx',
    api: '/api/data-status',
    expected: 'Data Grounding &amp; Readiness Audit',
    // Mock useState so [dataStatus, setDataStatus] returns loaded data, and [loading, setLoading] returns false
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  },
  {
    id: 'traceability',
    name: '03. RequirementsTraceabilityPage',
    componentPath: './src/components/RequirementsTraceabilityPage.jsx',
    api: '/api/traceability',
    expected: 'Requirements Traceability &amp; Governance Matrix',
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  },
  {
    id: 'vision',
    name: '04. VisualInspectionPage',
    componentPath: './src/components/VisualInspectionPage.jsx',
    api: null,
    expected: 'Visual Inspection &amp; Defect Studio'
  },
  {
    id: 'defect_explorer',
    name: '05. DefectExplorerPage',
    componentPath: './src/components/DefectExplorerPage.jsx',
    api: '/api/vision/batch-inspect?threshold=0.65',
    apiMethod: 'POST',
    expected: 'Defect Detection &amp; Taxonomy Catalog',
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  },
  {
    id: 'explainability',
    name: '06. EvidenceExplainabilityPage',
    componentPath: './src/components/EvidenceExplainabilityPage.jsx',
    api: null,
    expected: 'Evidence &amp; Explainability Studio'
  },
  {
    id: 'bottleneck',
    name: '07. BottleneckDetectionPage',
    componentPath: './src/components/BottleneckDetectionPage.jsx',
    api: '/api/bottlenecks',
    expected: 'Line Bottleneck &amp; Buffer Dynamics',
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  },
  {
    id: 'flow',
    name: '08. ProductionFlowPage',
    componentPath: './src/components/ProductionFlowPage.jsx',
    api: '/api/bottlenecks',
    expected: 'Interactive Production Flow &amp; Material Dynamics',
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  },
  {
    id: 'quality',
    name: '09. QualityPage',
    componentPath: './src/components/QualityPage.jsx',
    api: '/api/defects?threshold=0.65',
    expected: 'Automated Quality Inspection &amp; Defect Decisioning',
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  },
  {
    id: 'rootcause',
    name: '10. RootCausePage',
    componentPath: './src/components/RootCausePage.jsx',
    api: '/api/root-cause?target=quality_anomaly',
    expected: 'Multi-Tier Root Cause Attribution Tree',
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  },
  {
    id: 'drift',
    name: '11. BatchProcessDriftPage',
    componentPath: './src/components/BatchProcessDriftPage.jsx',
    api: '/api/vision/monitoring',
    expected: 'Batch Comparison &amp; Process Drift',
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  },
  {
    id: 'copilot',
    name: '12. IndustrialCopilotPage',
    componentPath: './src/components/IndustrialCopilotPage.jsx',
    api: null,
    expected: 'Industrial AI Copilot &amp; Advisory Engine'
  },
  {
    id: 'whatif',
    name: '13. WhatIfPage',
    componentPath: './src/components/WhatIfPage.jsx',
    api: '/api/simulate',
    apiMethod: 'POST',
    apiBody: { interventions: [] },
    expected: 'Surrogate What-If Simulator &amp; Scenario Planner',
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  },
  {
    id: 'economics',
    name: '14. EconomicsPage',
    componentPath: './src/components/EconomicsPage.jsx',
    api: '/api/economics',
    apiMethod: 'POST',
    apiBody: {
      unit_sale_price: 120.0,
      unit_material_cost: 45.0,
      scrap_cost_per_unit: 35.0,
      rework_cost_per_unit: 18.0,
      downtime_cost_per_hour: 4500.0,
      daily_operating_hours: 24.0
    },
    expected: 'Economic &amp; Profitability Impact Model',
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  },
  {
    id: 'monitoring',
    name: '15. ModelMonitoringPage',
    componentPath: './src/components/ModelMonitoringPage.jsx',
    api: '/api/vision/monitoring',
    expected: 'Model Calibration &amp; Drift Telemetry',
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  },
  {
    id: 'data_quality',
    name: '16. DataQualityPage',
    componentPath: './src/components/DataQualityPage.jsx',
    api: null,
    expected: 'Data Quality &amp; Sensor Diagnostics'
  },
  {
    id: 'recommendations',
    name: '17. RecommendationsPage',
    componentPath: './src/components/RecommendationsPage.jsx',
    api: '/api/recommendations',
    expected: 'Evidence-Based Industrial Action Directives',
    mockState: (data, init) => {
      if (init === null) return [data, () => {}];
      if (init === true) return [false, () => {}];
      return null;
    }
  }
];

async function runLiveLoadedTests() {
  console.log('================================================================');
  console.log('TESTING ALL 17 VIEWS IN FULLY-LOADED STATE WITH LIVE BACKEND');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      let liveData = null;
      if (t.api) {
        const opts = {
          method: t.apiMethod || 'GET',
          headers: t.apiBody ? { 'Content-Type': 'application/json' } : {}
        };
        if (t.apiBody) opts.body = JSON.stringify(t.apiBody);

        const res = await globalThis.fetch(`http://127.0.0.1:8001${t.api}`, opts);
        if (!res.ok) throw new Error(`HTTP ${res.status} from ${t.api}`);
        liveData = await res.json();
      }

      const mod = await import(t.componentPath);
      const Component = mod.default;

      const origUseState = React.useState;
      if (t.mockState && liveData) {
        React.useState = function(init) {
          const mocked = t.mockState(liveData, init);
          if (mocked !== null) return mocked;
          return origUseState(init);
        };
      }

      const props = t.makeProps ? t.makeProps(liveData) : { onNavigate: () => {}, onNavigateToTab: () => {} };
      const html = renderToString(React.createElement(Component, props));
      React.useState = origUseState;

      // Assertions
      const hasError = html.includes('VIEW RENDER ERROR') || html.includes('Error Loading') || html.includes('An unexpected client-side exception');
      const hasExpected = html.includes(t.expected);

      if (hasError) {
        console.error(`[FAIL] ${t.name}: Rendered error state or exception UI`);
        failed++;
      } else if (!hasExpected) {
        console.error(`[FAIL] ${t.name}: Missing expected loaded header string "${t.expected}"`);
        failed++;
      } else {
        console.log(`[PASS] ${t.name} -> Rendered ${html.length} chars (Verified "${t.expected}")`);
        passed++;
      }
    } catch (err) {
      console.error(`[FAIL] ${t.name}: Exception during live render ->`, err.message || err);
      failed++;
    }
  }

  console.log('================================================================');
  console.log(`FULLY-LOADED 17-VIEW AUDIT: ${passed}/${tests.length} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runLiveLoadedTests();
