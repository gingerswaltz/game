const WebSocket = require("ws");

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
        //console.log("[PLAYER] Got new message: ", result);
        if (result.method === "move") {
            this.server.moveHandler(result, this.clientId);
        }
        if (result.method === "resize") {
            this.server.game.renewSize(result.size)
        }

    }

    handleClose() {
        this.server.closeClient(this);
    }

    sendJoinMessage(symbol) {
        this.connection.send(JSON.stringify({
            method: "join",
            symbol: symbol,
            turn: "X",
            size: this.server.game.size,
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


module.exports = Player;
