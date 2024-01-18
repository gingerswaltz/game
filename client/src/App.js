// app.js
import React from "react";
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import Game from './Game';
import ReactDOM from 'react-dom';

function App() {
    return (
        <div className="App">
            <Switch>
                {/* Если у вас появятся другие маршруты, добавьте их здесь */}
                <Route path="/game/:roomId" component={Game} />
            </Switch>
        </div>
    );
}

// Оборачиваем приложение в BrowserRouter
ReactDOM.render(
    <React.StrictMode>
        <Router>
            <App />
        </Router>
    </React.StrictMode>,
    document.getElementById('root')
);

export default App;
