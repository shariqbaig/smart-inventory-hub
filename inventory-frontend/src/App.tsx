import AppRouter from './components/AppRouter';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';
import './styles/themes.css';

function App() {
  return (
    <ThemeProvider>
      <div className="App">
        <AppRouter />
      </div>
    </ThemeProvider>
  );
}

export default App
