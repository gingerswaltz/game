// script.js
let size = 3; // Инициализируем размер по умолчанию
let cellElements = [];
const messageElement = document.querySelector('.message');
let field = Array(size * size).fill(""); // Используем fill для инициализации массива пустыми значениями
let isGameActive = false;
let symbol = null;
let turn = null;
let ws = new WebSocket("ws://localhost:8080");
ws.onopen = function () {
  // Отправка информации о размере поля на сервер
  ws.send(JSON.stringify({
    "method": "resize",
    "size": size,
  }));
}

// генерация полей
function generateField() {
  field = Array(size * size).fill(""); // Пересоздаем поле при изменении размера
  generateBoard(size);
  updateBoard();
  cellElements = document.querySelectorAll('.cell');

cellElements.forEach((cell, index) => cell.addEventListener('click', (event) => {
  console.log(cellElements);
  console.log("cell clicked: ", cell, index);
  makeMove(event.target, index);
}));
}


// кнопки изменения размера
document.getElementById('size3Button').addEventListener('click', function () {
  changeBoardSize(3);
});
document.getElementById('size4Button').addEventListener('click', function () {
  changeBoardSize(4);
});
document.getElementById('size5Button').addEventListener('click', function () {
  changeBoardSize(5);
});

function generateBoard(size) {
  console.log("Generating board with size:", size);

  const board = document.querySelector(".board");
  board.innerHTML = ""; // Очищаем существующее поле

  let columns;
  switch (size) {
    case 3:
      columns = 3;
      break;
    case 4:
      columns = 4;
      break;
    case 5:
      columns = 5;
      break;
    default:
      columns = 3;
      break;
  }


  // Создаем сетку с заданным количеством колонок
  board.style.gridTemplateColumns = `repeat(${columns}, 20vmin)`;

  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");

    // Создаем текстовый узел с неразрывным пробелом и добавляем его в ячейку
    // const space = document.createTextNode("\u00A0");
    // cell.appendChild(space);

    board.appendChild(cell);
  }

  console.log("Board generated successfully");
}

// сеттер размера
function changeBoardSize(newSize) {
  size = newSize;

  ws.send(JSON.stringify({
    "method": "resize",
    "size": size,
  }));  
  generateField();
}


ws.onmessage = message => {
  const response = JSON.parse(message.data);
  console.log("From server:", response);
  if (response.method === "join") {
    symbol = response.symbol;
    turn = response.turn;
    isGameActive = symbol === turn;
    updateMessage();
  }

  if (response.method === "update") {
    field = response.field;
    turn = response.turn;
    isGameActive = symbol === turn;
    updateBoard();
    updateMessage();
  }

  if (response.method === "result") {
    field = response.field;
    updateBoard();
    isGameActive = false;
    setTimeout(() => {
      messageElement.textContent = response.message;
    }, 100);
  }

  if (response.method === "left") {
    isGameActive = false;
    messageElement.textContent = response.message;
  }

};



function makeMove(cell, index) {
  console.log("Making a move...");

  if (!isGameActive || field[index] !== "") {
    console.log("Invalid move. Game is not active or cell is already occupied.");
    return;
  }

  isGameActive = false;
  cell.classList.add(symbol);
  field[index] = symbol;

  ws.send(JSON.stringify({
    "method": "move",
    "symbol": symbol,
    "field": field,
    "size": size,
  }));
}

function updateBoard() {
  cellElements.forEach((cell, index) => {
    cell.classList.remove("X", "O");
    field[index] !== "" && cell.classList.add(field[index]);
  });
}



function updateMessage() {
  if (symbol === turn) {
    messageElement.textContent = "move";
  } else {
    messageElement.textContent = `waiting ${turn}...`;
  }
}

