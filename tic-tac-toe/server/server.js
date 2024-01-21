const express = require('express');
const path = require('path');
const http = require("http");
const WebSocket = require("ws");

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

    if (this.clientIdsWaitingMatch.length < 2) return;


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

    if (this.checkWin(result.field, result.size)) {
      [clientId, opponentClientId].forEach(cid => {
        this.clientConnections[cid].sendResultMessage(`${result.symbol} win`, result.field, result.size);
      })
    }

    if (this.checkDraw(result.field)) {
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
  
  generateWinningCombos(size) {
    if (size < 3) {
      throw new Error("Invalid field size. Minimum size is 3x3.");
    }

    const winningCombos = [];

    // Rows (Горизонтали)
    for (let i = 0; i < size; i++) {
      winningCombos.push(Array.from({ length: size }, (_, j) => i * size + j));
    }

    // Columns (Вертикали)
    for (let i = 0; i < size; i++) {
      winningCombos.push(Array.from({ length: size }, (_, j) => i + j * size));
    }

    // Diagonals (Диагонали)
    winningCombos.push(Array.from({ length: size }, (_, i) => i * (size + 1)));  // Главная диагональ
    winningCombos.push(Array.from({ length: size }, (_, i) => (size - 1) * (i + 1)));  // Побочная диагональ

    return winningCombos;
  }



  checkWin(field, size) {
    const winningCombos = this.generateWinningCombos(size);
    // Проверка по горизонтали, вертикали и диагонали
    const checkCombo = (combo) => {
      const symbols = combo.map(index => field[index]);
      return symbols.every(symbol => symbol !== "" && symbol === symbols[0]);
    };
    return winningCombos.some(combo => checkCombo(combo));
  }

  checkDraw(field) {
    return field.every(symbol => symbol === "X" || symbol === "O");
  }

}

// Класс игрока
class Player {
  static clientIdCounter = 0;

  constructor(connection, server) {
    this.connection = connection;
    this.server = server;
    this.clientId = ++Player.clientIdCounter;
    this.isWaitingMatch = true;

    this.connection.on("message", this.handleMessage.bind(this));
    this.connection.on("close", this.handleClose.bind(this));
  }

  handleMessage(message) {
    const result = JSON.parse(message);

    if (result.method === "move") {
      this.server.moveHandler(result, this.clientId);
    }
  }

  handleClose() {
    this.server.closeClient(this);
  }

  sendJoinMessage(symbol) {
    this.connection.send(JSON.stringify({
      method: "join",
      symbol: symbol,
      turn: "X"
    }));
    this.isWaitingMatch = false;
  }

  sendResultMessage(message, field, size) {
    this.connection.send(JSON.stringify({
      method: "result",
      message: message,
      field: field,
      size: size,
    }));
  }

  sendExitMessage() {
    if (this.connection.readyState === WebSocket.OPEN) {
      this.connection.send(JSON.stringify({
        method: "left",
        message: "opponent left",
      }));
    }
  }
  

  sendUpdateMessage(turn, field) {
    this.connection.send(JSON.stringify({
      method: "update",
      turn: turn,
      field: field,
    }));
  }
}

const ticTacToeServer = new TicTacToeServer();