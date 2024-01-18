import React from "react";
import { Switch, Route } from 'react-router-dom';
import Game from './Game';


function App() {
    return (
        <div className="App">
            <Switch>
                {/* Switch роутов для маршрутизации */}
                <Route path="/game/:roomId" component={Game} />
            </Switch>
        </div>
    );
}


export default App;