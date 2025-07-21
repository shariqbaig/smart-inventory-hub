import { useEffect, useState } from 'react';
import AppRouter from './components/AppRouter';
import { ThemeProvider } from './contexts/ThemeContext';
import { initializeServices } from './services/init';
import './App.css';
import './styles/themes.css';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeServices();
        setInitError(null);
      } catch (error) {
        console.error('Service initialization failed:', error);
        setInitError(error instanceof Error ? error.message : 'Initialization failed');
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  if (isInitializing) {
    return (
      <div className="App">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>Initializing Smart Inventory Hub...</div>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="App">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem',
          padding: '2rem'
        }}>
          <div style={{ color: 'red', fontSize: '1.2rem' }}>Initialization Error</div>
          <div style={{ textAlign: 'center', maxWidth: '600px' }}>
            {initError}
          </div>
          <button onClick={() => window.location.reload()} style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#0F4C8C', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="App">
        <AppRouter />
      </div>
    </ThemeProvider>
  );
}

export default App
