const express = require('express');
const path = require('path');
const http = require("http");
const WebSocket = require("ws");

// Класс сервера "крестики-нолики"
class TicTacToeServer {
  constructor() {
    this.app = express();
    this.httpServer = http.createServer();
    this.wss = new WebSocket.Server({ server: this.httpServer });

    this.clientConnections = {};
    this.opponents = {};
    this.clientIdsWaitingMatch = [];

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

  handleConnection(connection) {
    const player = new Player(connection, this);
    this.clientConnections[player.clientId] = player;
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
    player.connection.close();
    if (player.isWaitingMatch) {
      this.clientIdsWaitingMatch = this.clientIdsWaitingMatch.filter(id => id !== player.clientId);
    } else {
      const opponentClientId = this.opponents[player.clientId];
      this.clientConnections[opponentClientId].sendResultMessage("opponent left");
    }

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


  sendUpdateMessage(turn, field) {
    this.connection.send(JSON.stringify({
      method: "update",
      turn: turn,
      field: field,
    }));
  }
}

const ticTacToeServer = new TicTacToeServer();