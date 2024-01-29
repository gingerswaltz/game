// server.js
const express = require('express');
const path = require('path');
const http = require("http");
const WebSocket = require("ws");
const Player = require('./player');
const TicTacToeGame = require('./game')
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
    this.game = new TicTacToeGame(3); // Пример: поле размером 3x3
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



  matchClients(clientId) {
    this.clientIdsWaitingMatch.push(clientId);

    if (this.clientIdsWaitingMatch.length < 2) {
      //console.log ("[SERVER]  Waiting match length: ", this.clientIdsWaitingMatch.length);
      //console.log("[SERVER] Choosing a host: ", this.clientConnections[clientId]);
      
      // Если данный клиент подключился к игре первее, он будет хостом. Ставим флаг хоста true
      this.clientConnections[clientId].isHost = true;
      // Отсылаем интерфейсу информацию о хосте
      this.clientConnections[clientId].sendHostMessage();
      return;
    }

    // Извлекаем первого и второго клиентов из очереди ожидания
    const firstClientId = this.clientIdsWaitingMatch.shift();
    const secondClientId = this.clientIdsWaitingMatch.shift();

    // Устанавливаем соответствие между первым и вторым клиентами
    this.opponents[firstClientId] = secondClientId;
    this.opponents[secondClientId] = firstClientId;

    // Отправляем сообщение о присоединении первому и второму клиентам
    this.clientConnections[firstClientId].sendJoinMessage("X");
    this.clientConnections[secondClientId].sendJoinMessage("O");

  }


  moveHandler(result, clientId) {
    const opponentClientId = this.opponents[clientId];

    if (this.game.checkWin(result.field)) {
      [clientId, opponentClientId].forEach(cid => {
        this.clientConnections[cid].sendResultMessage(`${result.symbol} win`, result.field, result.size);
      });
    }

    if (this.game.checkDraw(result.field)) {
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


  //   handleMessage(message) {
  //     const result = JSON.parse(message);

  //     if (result.method === "resize") {
  //         this.game.renewSize(result.size);
  //     }
  // }

}

const ticTacToeServer = new TicTacToeServer();