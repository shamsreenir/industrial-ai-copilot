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

const tabs = [
  { id: 'overview', name: '01. Executive Command Center', expected: 'Executive Command Center' },
  { id: 'setup', name: '02. Data Grounding & Readiness', expected: 'Data Grounding & Readiness' },
  { id: 'traceability', name: '03. Requirements Traceability', expected: 'Requirements Traceability' },
  { id: 'vision', name: '04. Visual Inspection Studio', expected: 'Visual Inspection' },
  { id: 'defect_explorer', name: '05. Defect Detection & Catalog', expected: 'Defect Detection & Taxonomy' },
  { id: 'explainability', name: '06. Evidence & Explainability', expected: 'Evidence & Explainability' },
  { id: 'bottleneck', name: '07. Bottleneck & Buffer Dynamics', expected: 'Line Bottleneck & Buffer Dynamics' },
  { id: 'flow', name: '08. Interactive Production Flow', expected: 'Interactive Production Flow' },
  { id: 'quality', name: '09. Quality & Anomaly Operations', expected: 'Quality' },
  { id: 'rootcause', name: '10. Root Cause Analysis', expected: 'Root Cause' },
  { id: 'drift', name: '11. Batch Comparison & Drift', expected: 'Batch Comparison & Process Drift' },
  { id: 'copilot', name: '12. AI Industrial Copilot', expected: 'Industrial AI Copilot' },
  { id: 'whatif', name: '13. What-If Simulation', expected: 'Surrogate What-If Simulator' },
  { id: 'economics', name: '14. Economic Impact Model', expected: 'Economic & Profitability Impact Model' },
  { id: 'monitoring', name: '15. Model Calibration & Drift', expected: 'Model Calibration & Drift Telemetry' },
  { id: 'data_quality', name: '16. Data Quality & Diagnostics', expected: 'Data Quality & Sensor Diagnostics' },
  { id: 'recommendations', name: '17. Action Directives', expected: 'Action Directives' }
];

async function runNavigationAudit() {
  console.log('================================================================');
  console.log('STARTING FULL APP NAVIGATION & RENDERING VERIFICATION');
  console.log('Testing 17-View Switching In App Container with Live Backend');
  console.log('================================================================');

  let AppMod;
  try {
    AppMod = await import('./src/App.jsx');
  } catch (err) {
    console.error('Failed to import App.jsx:', err);
    process.exit(1);
  }

  const App = AppMod.default;

  // Preload overview data
  let overviewData = null;
  try {
    const res = await globalThis.fetch('http://127.0.0.1:8001/api/overview');
    overviewData = await res.json();
    console.log('[OK] Live FastAPI /api/overview loaded successfully');
  } catch (err) {
    console.warn('[WARN] Could not fetch /api/overview:', err.message);
  }

  let passed = 0;
  let failed = 0;

  for (const tab of tabs) {
    try {
      const html = renderToString(React.createElement(App, { defaultTab: tab.id }));

      // Verify that "VIEW RENDER ERROR" is NOT in the output
      if (html.includes('VIEW RENDER ERROR')) {
        console.error(`[FAIL] ${tab.name} (${tab.id}): ErrorBoundary caught an exception!`);
        failed++;
      } else if (!html.includes(tab.expected)) {
        console.error(`[FAIL] ${tab.name} (${tab.id}): Expected string "${tab.expected}" not found in output!`);
        failed++;
      } else {
        console.log(`[PASS] ${tab.name} (${tab.id}) -> Rendered ${html.length} bytes (Verified "${tab.expected}")`);
        passed++;
      }
    } catch (err) {
      console.error(`[FAIL] ${tab.name} (${tab.id}): Uncaught exception ->`, err.message || err);
      failed++;
    }
  }

  console.log('================================================================');
  console.log(`NAVIGATION AUDIT SUMMARY: ${passed}/${tabs.length} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runNavigationAudit();
