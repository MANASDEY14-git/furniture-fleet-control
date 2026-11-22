import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from 'next-themes';

// Automatically reload on new deployments when an old chunk or stylesheet is requested
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <ThemeProvider attribute="class">
    <App />
  </ThemeProvider>
);
