import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import FileManager from './components/FileManager';
import Login from './components/Login';
import apiService from './services/api';
import './assets/css/main.css';

function FileManagerWithRouting() {
  const { '*': pathParam } = useParams();
  const navigate = useNavigate();
  
  const currentPath = pathParam ? pathParam.split('/').filter(p => p) : [];
  
  const handleNavigation = (newPath) => {
    const route = newPath.length > 0 ? '/' + newPath.join('/') : '/';
    navigate(route);
  };

  return (
    <FileManager 
      currentPath={currentPath}
      onNavigate={handleNavigation}
    />
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    setIsAuthenticated(apiService.isAuthenticated());
    setLoading(false);
  }, []);

  const handleLogin = (loginData) => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    apiService.logout();
    setIsAuthenticated(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="App">
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000
        }}>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Logout ({localStorage.getItem('username')})
          </button>
        </div>
        <Routes>
          <Route path="/*" element={<FileManagerWithRouting />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;