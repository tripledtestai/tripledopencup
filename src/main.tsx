import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign browser ResizeObserver loop notification error events
window.addEventListener('error', (event) => {
  if (
    event.message &&
    (event.message.includes('ResizeObserver loop completed with undelivered notifications') ||
      event.message.includes('ResizeObserver loop limit exceeded'))
  ) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(<App />);
