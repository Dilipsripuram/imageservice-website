import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './services/api';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);