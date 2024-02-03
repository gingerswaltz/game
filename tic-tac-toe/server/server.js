// server.js
const express = require('express');
const path = require('path');
const http = require("http");
const WebSocket = require("ws");
const Player = require('./player');
const game = require('./game')

// todo: метод возвращающий игру по clientId

// Класс сервера "крестики-нолики"
class TicTacToeServer {
  // Конструктор класса TicTacToeServer
  constructor() {
    // Инициализация объектов сервера, WebSocket и соответствующих списков
    this.app = express();                  // Экспресс-приложение
    this.httpServer = http.createServer();  // HTTP-сервер
    this.wss = new WebSocket.Server({ server: this.httpServer });  // Сервер WebSocket

    // Список активных соединений клиентов WebSocket
    this.clientConnections = {};
    this.games = [];
    // Словарь для отслеживания соответствия оппонентов по их clientId
    this.opponents = {};

    // Список clientId ожидающих матча
    this.clientIdsWaitingMatch = [];

    // Вызов методов настройки для Express и WebSocket
    this.setupExpress();
    this.setupWebSocket();
  }

  setupExpress() {
    this.app.use(express.static(path.join(__dirname, '..', 'client')));
    this.app.listen(3000);
    this.httpServer.listen(8080);
  }

  setupWebSocket() {
    this.wss.on("connection", this.handleConnection.bind(this));
  }

  // Метод обработки нового подключения к серверу WebSocket
  handleConnection(connection) {
    // Создание нового объекта игрока, передавая ему соединение и ссылку на текущий сервер
    const player = new Player(connection, this);

    // Добавление игрока в список клиентов с использованием clientId в качестве ключа
    this.clientConnections[player.clientId] = player;

    // Попытка сопоставить игроков для начала матча
    this.matchClients(player.clientId);
  }

  
  findGameIndexByClientId(clientId) {
    // Ищем игру, в которой участвует игрок с указанным clientId
    for (let i = 0; i < this.games.length; i++) {
      const game = this.games[i];
      if (game.currentPlayers.some(player => player.clientId === clientId)) {
        return i; // Возвращаем индекс игры
      }
    }
    return -1; // Если игра не найдена
  }


  matchClients(clientId) {
    this.clientIdsWaitingMatch.push(clientId);

    if (this.clientIdsWaitingMatch.length < 2) {
      //console.log ("[SERVER]  Waiting match length: ", this.clientIdsWaitingMatch.length);
      //console.log("[SERVER] Choosing a host: ", this.clientConnections[clientId]);

      // Если данный ИГРОК подключился к игре первее, он будет хостом. Ставим флаг хоста true
      this.clientConnections[clientId].isHost = true;
      // Отсылаем интерфейсу информацию о хосте
      this.clientConnections[clientId].sendHostMessage();
      // Создаем игру
      this.games.push(new game(0));
      // Добавим игрока в список игроков в новой игре
      this.games[this.games.length - 1].
        currentPlayers.
        push(this.clientConnections[clientId]);
      // Назначим первому игроку номер игры
      this.clientConnections[clientId].gameId = this.games[this.games.length - 1].gameId;
      return;
    }

    // Извлекаем первого и второго клиентов из очереди ожидания
    const firstClientId = this.clientIdsWaitingMatch.shift();
    const secondClientId = this.clientIdsWaitingMatch.shift();
    // присваиваем номер игры
    this.clientConnections[secondClientId].gameId = this.clientConnections[firstClientId].gameId;

    // Устанавливаем соответствие между первым и вторым клиентами
    this.opponents[firstClientId] = secondClientId;
    this.opponents[secondClientId] = firstClientId;

    // Отправляем сообщение о присоединении первому и второму клиентам
    this.clientConnections[firstClientId].sendJoinMessage("X");
    this.clientConnections[secondClientId].sendJoinMessage("O");

  }


  moveHandler(result, clientId) {
    const opponentClientId = this.opponents[clientId];
    const gameId = this.clientConnections[clientId].gameId;

    if (this.games[gameId - 1].checkWin(result.field)) {
      [clientId, opponentClientId].forEach(cid => {
        this.clientConnections[cid].sendResultMessage(`${result.symbol} win`, result.field, result.size);
      });
    }

    if (this.games[gameId - 1].checkDraw(result.field)) {
      [clientId, opponentClientId].forEach(cid => {
        this.clientConnections[cid].sendResultMessage("Draw", result.field);
      });
    }

    [clientId, opponentClientId].forEach(cid => {
      this.clientConnections[cid].sendUpdateMessage(result.symbol === "X" ? "O" : "X", result.field);
    });

  }

  closeClient(player) {
    if (player.isWaitingMatch) {
      this.clientIdsWaitingMatch = this.clientIdsWaitingMatch.filter(id => id !== player.clientId);
    } else {
      const opponentClientId = this.opponents[player.clientId];
      if (this.clientConnections[opponentClientId]) {
        this.clientConnections[opponentClientId].sendExitMessage();
      }
    }
    player.connection.close();
    delete this.clientConnections[player.clientId];
  }

  handleReadyMessage(clientId, category) {
    const opponentClientId = this.opponents[clientId];

    // Отправляем сообщение оппоненту
    if (opponentClientId && this.clientConnections[opponentClientId]) {
      this.clientConnections[opponentClientId].sendHostReadyMessage(category);
    }

  }
  
  handleResizeMessage(clientId) {
    const opponentClientId = this.opponents[clientId];

    // Отправляем сообщение оппоненту
    if (opponentClientId && this.clientConnections[opponentClientId]) {
      this.clientConnections[opponentClientId].sendResizeMessage();
    }

  }


}

const ticTacToeServer = new TicTacToeServer();