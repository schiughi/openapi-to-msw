import React from 'react';
import ReactDOM from 'react-dom';
import { setupWorker } from 'msw';
import { getHandlers } from 'openapi-to-msw';

import './index.css';
import App from './App';
import { factories } from './mock';

const startWorker = () => {
  const worker = setupWorker(getHandlers(factories, { statusCode: 'success' }));
  worker.start();
};

function mountApp() {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('root')
  );
}

if (process.env.NODE_ENV === 'development') {
  startWorker();
}

mountApp();
