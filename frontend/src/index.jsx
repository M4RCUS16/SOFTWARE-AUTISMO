import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './styles/tailwind.css';

const container = document.getElementById('root');

if (!container) {
  // Helps diagnose issues when the root element is not present.
  // eslint-disable-next-line no-console
  console.error('Elemento #root não encontrado no DOM.');
} else {
  // eslint-disable-next-line no-console
  console.log('Inicializando aplicativo NeuroAtlas TEA...');
  const root = createRoot(container);
  root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
