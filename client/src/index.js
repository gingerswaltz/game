import React from "react";
import { ReactDOM } from "react";
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';

// Рендеринг основного компонента App внутри BrowserRouter
ReactDOM.render(
    <Router>
      <App />
    </Router>,
    document.getElementById('root')
  );