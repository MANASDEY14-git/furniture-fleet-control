import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from 'next-themes';

// Recover from stale deployment references to removed JavaScript or stylesheet chunks.
window.addEventListener('vite:preloadError', (event) => {
  const retryKey = 'vite-preload-reload-at';
  const lastRetry = Number(sessionStorage.getItem(retryKey) || 0);

  if (Date.now() - lastRetry > 30_000) {
    event.preventDefault();
    sessionStorage.setItem(retryKey, String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <ThemeProvider attribute="class">
    <App />
  </ThemeProvider>
);
