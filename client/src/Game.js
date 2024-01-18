/* eslint-disable no-useless-constructor */
import React,  { useState } from 'react';
import io from 'socket.io-client';

const Game = () => {
        const [playerName, setPlayerName] = useState('')

    
        return (
            <div className='container mt-5'>
                <div className='row justify-content-center'></div>
                <div className='col-md-6'></div>
                <div className='card'></div>
                <div className='card-body'></div>
                <h5 className='card-title'>Введите ваше имя</h5>
                <form>
                    <div className='form-group'>
                        <label htmlFor='playerName'>Имя игрока</label>
                        <input
                            type='text'
                            className='form-control'
                            id='playerName'
                            value={this.state.playerName}
                            onChange={(e) => this.setState({ playerName: e.target.value })}
                            />
                    </div>
                </form>
            </div>
        )
};




// Экспорт компонента для использования в других частях приложения
export default Game;