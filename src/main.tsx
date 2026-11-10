import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles/theme.css';
import { App } from './App';
import { db } from './db/db';
import { setupAutoUpdate } from './state/autoUpdate';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');
const root = createRoot(rootEl);

// Open (and on first launch, seed) the local database before showing the app.
db.open()
  .then(() => {
    // Ask the browser not to evict our data under storage pressure (granted silently on most
    // browsers once the app is installed or used often). Failure is harmless.
    void navigator.storage?.persist?.().catch(() => undefined);
    setupAutoUpdate();
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err: unknown) => {
    console.error(err);
    root.render(
      <div className="mx-auto max-w-md p-6 pt-16 text-center">
        <h1 className="text-2xl font-bold">Budgeta can't open its storage</h1>
        <p className="mt-2 text-on-surface-variant">
          Your browser blocked local storage (this can happen in private/incognito mode or when storage is full). Open
          Budgeta in a normal browser window and try again.
        </p>
      </div>,
    );
  });
