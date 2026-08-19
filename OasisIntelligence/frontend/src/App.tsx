import React, { useState, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { User } from './types';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import './index.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

interface EBProps {
  children: ReactNode;
  onReset: () => void;
}

interface EBState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Dashboard:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-box">
          <h2>Something went wrong in the dashboard</h2>
          <p className="error-message">{this.state.errorMessage}</p>
          <button
            className="btn-primary btn-reset-error"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              this.props.onReset();
            }}
          >
            Return to Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('oasisUser');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const handleLogout = () => {
    sessionStorage.removeItem('oasisUser');
    setUser(null);
  };

  return (
    <div className="app-container">
      {!user ? (
        <Auth onLogin={setUser} apiBase={API_BASE} />
      ) : (
        <ErrorBoundary onReset={handleLogout}>
          <Dashboard user={user} onLogout={handleLogout} apiBase={API_BASE} />
        </ErrorBoundary>
      )}
    </div>
  );
};

export default App;
