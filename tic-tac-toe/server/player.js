const WebSocket = require("ws");
// todo: везде где индекс game - 1 нужно заменить на метод с сервера который даст нужную по айдишнику игру 
// Класс игрока
class Player {
    static clientIdCounter = 0;

    constructor(connection, server) {
        this.connection = connection;
        this.server = server;
        this.clientId = ++Player.clientIdCounter;
        this.isWaitingMatch = true;
        this.isHost = false; // Станет true в особом случае на сервере 
        this.gameId = null; // изначально у игрока нет gameId, он появится сразу после создания объекта игры
        this.connection.on("message", this.handleMessage.bind(this));
        this.connection.on("close", this.handleClose.bind(this));
    }

    handleMessage(message) {
        const result = JSON.parse(message);
        //console.log("[PLAYER] Got new message: ", result);
        const gameIndex = this.server.findGameIndex(this.clientId);

        if (result.method === "move") {
            this.server.moveHandler(result, this.clientId);
        }
        if (result.method === "resize") {
            this.server.games[gameIndex].renewSize(result.size);
            this.server.handleResizeMessage(this.clientId, result.size);
        }
        if (result.method === "hostReady") {
            this.server.handleReadyMessage(this.clientId, result.category);
        }

    }

    handleClose() {
        this.server.closeClient(this);
    }

    sendJoinMessage(symbol) {
        const gameIndex = this.server.findGameIndex(this.clientId);

        this.connection.send(JSON.stringify({
            method: "join",
            symbol: symbol,
            turn: "X",
            size: this.server.games[gameIndex].size,
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

    sendHostMessage() {
        if (this.isHost) {
            this.connection.send(JSON.stringify({
                method: "isHost",
            }));
        }
    }

    sendHostReadyMessage(category) {
        this.connection.send(JSON.stringify({
            method: "hostReady",
            selectedCategory: category,
        }));
    }

    sendResizeMessage() {
        const gameIndex = this.server.findGameIndex(this.clientId);
        this.connection.send(JSON.stringify({
            method: "resize",
            size: this.server.games[gameIndex].size,
        }));
    }
}


module.exports = Player;
