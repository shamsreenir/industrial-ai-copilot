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

async function testDrift() {
  try {
    const res = await fetch('http://127.0.0.1:8001/api/vision/monitoring');
    const data = await res.json();
    console.log('Fetched data successfully, drift_features count:', data.drift_features?.length);
    
    // Test importing BatchProcessDriftPage
    const mod = await import('./src/components/BatchProcessDriftPage.jsx');
    const Comp = mod.default;
    const html = renderToString(React.createElement(Comp));
    console.log('BatchProcessDriftPage initial HTML length:', html.length);
  } catch (err) {
    console.error('ERROR in testDrift:', err.stack || err);
  }
}

testDrift();
