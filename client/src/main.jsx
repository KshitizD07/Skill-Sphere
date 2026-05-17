/**
 * Copyright (c) 2026 Kshitiz Dixit. All Rights Reserved.
 * This source code is proprietary and confidential.
 * Unauthorized copying of this file, via any medium, is strictly prohibited.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './app/App.css';
import App from './app/App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
