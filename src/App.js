import React from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import FileManager from './components/FileManager';
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
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/*" element={<FileManagerWithRouting />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;