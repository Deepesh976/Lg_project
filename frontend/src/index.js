// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './main';

const container = document.getElementById('root');

if (!container) {
  throw new Error("#root container not found - check index.html");
}

// store the root on the DOM node so re-executions reuse it (prevents duplicate createRoot)
if (!container._reactRoot) {
  container._reactRoot = ReactDOM.createRoot(container);
}

container._reactRoot.render(<App />);
