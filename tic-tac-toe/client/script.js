// script.js
let size = null; // Инициализируем размер по умолчанию
let cellElements = [];
const messageElement = document.querySelector('.message');
let field = Array(size * size).fill(""); // Используем fill для инициализации массива пустыми значениями
let isGameActive = false;
let symbol = null;
let turn = null;
let ws = new WebSocket("ws://localhost:8080");
const buttonContainer = document.getElementById("sizeButtons");
buttonContainer.style.display = 'none';
let isCustom = false;
const board = document.querySelector('.board');

// генерация полей
function generateField() {
  field = Array(size * size).fill(""); // Пересоздаем поле при изменении размера
  generateBoard(size);
  updateBoard();
  cellElements = document.querySelectorAll('.cell');

  cellElements.forEach((cell, index) => cell.addEventListener('click', (event) => {
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


//  генерация игрового поля
function generateBoard(size) {

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
    board.appendChild(cell);
  }
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
  //console.log("From server: ", response);

  // Обработка входа игрока
  if (response.method === "join") {
    symbol = response.symbol;
    turn = response.turn;
    size = size === null ? 3 : size;
    isGameActive = symbol === turn;
    changeBoardSize(size);
    updateMessage();
  }

  // Выведем сообщение о состоянии хода (кто ходит?)
  if (response.method === "update") {
    field = response.field;
    turn = response.turn;
    isGameActive = symbol === turn;
    updateBoard();
    updateMessage();
    buttonContainer.style.display = 'none';
  }

  // Выведем сообщение об исходе схватки
  if (response.method === "result") {
    field = response.field;
    updateBoard();
    isGameActive = false;
    setTimeout(() => {
      messageElement.textContent = response.message;
    }, 100);
  }

  // Выведем сообщение о выходе оппонента
  if (response.method === "left") {
    isGameActive = false;
    messageElement.textContent = response.message;
  }

  // Хосту отрисуем кнопки изменения размера
  if (response.method === "isHost") {
    buttonContainer.style.display = 'block';
  }
};

// обработка нажатия на клетку
function makeMove(cell, index) {

  if (!isGameActive || field[index] !== "") {
    return;
  }

  isGameActive = false;

  // Убираем классы X и X-img, если они были установлены ранее
  cell.classList.remove('X', 'X-img');

  // Добавляем класс X-img, если символ - X
  if (symbol === 'X') {
    cell.classList.remove('X');
    cell.classList.add('X-img');
  } else {
    // Иначе добавляем класс O-img
    cell.classList.add('O-img');
  }

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
    buttonContainer.style.display = 'none';
  } else {
    messageElement.textContent = `waiting ${turn}...`;
    buttonContainer.style.display = 'none';
  }
}

