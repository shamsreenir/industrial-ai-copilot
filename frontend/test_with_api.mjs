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

async function testPageWithRealAPI(name, compPath, endpoint, method = 'GET', body = null) {
  try {
    const fetchOptions = { method };
    if (body) {
      fetchOptions.headers = { 'Content-Type': 'application/json' };
      fetchOptions.body = JSON.stringify(body);
    }
    const res = await fetch(`http://127.0.0.1:8001${endpoint}`, fetchOptions);
    if (!res.ok) {
      console.error(`API FAIL: ${endpoint} status ${res.status}`);
      return;
    }
    const apiData = await res.json();
    console.log(`API SUCCESS: ${name} from ${endpoint}`);

    // Now mock fetch in globalThis so when component mounts and fetches, it gets this exact data
    globalThis.fetch = async (url) => {
      return {
        ok: true,
        status: 200,
        json: async () => apiData,
        text: async () => JSON.stringify(apiData)
      };
    };

    const mod = await import(compPath);
    const Component = mod.default;

    // In React 19 SSR, useEffect does not run by default, but we can test rendering with pre-populated data or hooks
    // Let's test the component render
    const html = renderToString(React.createElement(Component, { onNavigate: () => {}, onNavigateToTab: () => {} }));
    console.log(`RENDER PASS: ${name} (${html.length} chars)`);
  } catch (err) {
    console.error(`ERROR in ${name}:`, err);
  }
}

async function runAll() {
  await testPageWithRealAPI('BottleneckDetectionPage', './src/components/BottleneckDetectionPage.jsx', '/api/bottlenecks');
  await testPageWithRealAPI('ProductionFlowPage', './src/components/ProductionFlowPage.jsx', '/api/overview');
  await testPageWithRealAPI('RootCausePage', './src/components/RootCausePage.jsx', '/api/root-cause');
  await testPageWithRealAPI('BatchProcessDriftPage', './src/components/BatchProcessDriftPage.jsx', '/api/vision/monitoring');
  await testPageWithRealAPI('WhatIfPage', './src/components/WhatIfPage.jsx', '/api/simulate', 'POST', { interventions: [] });
  await testPageWithRealAPI('EconomicsPage', './src/components/EconomicsPage.jsx', '/api/economics', 'POST', {
    unit_sale_price: 120.0,
    unit_material_cost: 45.0,
    scrap_cost_per_unit: 35.0,
    rework_cost_per_unit: 18.0,
    downtime_cost_per_hour: 4500.0,
    daily_operating_hours: 24.0
  });
  await testPageWithRealAPI('ModelMonitoringPage', './src/components/ModelMonitoringPage.jsx', '/api/vision/monitoring');
  await testPageWithRealAPI('RecommendationsPage', './src/components/RecommendationsPage.jsx', '/api/recommendations');
  await testPageWithRealAPI('DataStatusPage', './src/components/DataStatusPage.jsx', '/api/data-status');
  await testPageWithRealAPI('RequirementsTraceabilityPage', './src/components/RequirementsTraceabilityPage.jsx', '/api/traceability');
}

runAll();
