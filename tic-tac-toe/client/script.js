// script.js
let size = 0; // Инициализируем размер по умолчанию
let cellElements = [];
const messageElement = document.querySelector('.message');
let field = Array(size * size).fill(""); // Используем fill для инициализации массива пустыми значениями
let isGameActive = false;
let symbol = null;
let turn = null;
let ws = new WebSocket("ws://localhost:8080");
const buttonContainer = document.getElementById("sizeButtons");
const buttonImg = document.getElementById("changeImg");
buttonContainer.style.display = 'none';
buttonImg.style.display = 'none';
let isCustom = false;
const board = document.querySelector('.board');
const tictacImg = {
  "zemelya": ["./custom/osipov1.svg", "./custom/petan1.svg"],
  "cpu": ["./custom/intel.svg", "./custom/amd.svg"],
}; // категории картинок и их соответствие
let selectedCategory; // выбранная категория картинок
let isHostReady = false;
let isHost = false;

// событие переключения с картинок на сток
changeImageBtn.addEventListener('click', function () {
  handleDropDownChange();
});


function handleDropDownChange() {
  const imageDropdown = document.getElementById('imageDropdown');
  selectedCategory = imageDropdown.value.toLowerCase();
  handleImageChange();
}


document.getElementById('readyButton').addEventListener('click', function () {
  selectedCategory = isCustom === false ? 'stock' : selectedCategory;
  //console.log("sending to server: ", size);
  ws.send(JSON.stringify({
    "method": "resize",
    "size": size,
  }));
  // Отправка сообщения о готовности серверу
  ws.send(JSON.stringify({
    "method": "hostReady",
    "category": selectedCategory
  }));
  isHostReady = true;
  updateMessage();
});

// переключатель картинка/стоковые tic-tac
function handleImageChange() {
  //console.log(selectedCategory);
  if (selectedCategory != "stock")
    isCustom = true;
  else
    isCustom = false;
  //console.log("custom flag:", isCustom);
  updateBoard();
}

// Функция для обновления изображений с использованием значений из объекта
function updateBackgroundImages() {
  cellElements.forEach((cell, index) => {
    const xIndex = 0;  // Индекс для X-img
    const oIndex = 1;  // Индекс для img-O

    // Выбираем изображение в зависимости от символа в поле (X или O)
    const backgroundImage = field[index] === "X"
      ? `url('${tictacImg[selectedCategory][xIndex]}')`
      : `url('${tictacImg[selectedCategory][oIndex]}')`;

    // Применяем выбранное изображение к фону ячейки
    cell.style.setProperty('--bg-img-before', backgroundImage);
    cell.style.setProperty('--bg-img-after', backgroundImage);
  });
}

// генерация полей
function generateField() {
  field = Array(size * size).fill(""); // Пересоздаем поле при изменении размера
  generateBoard(size);
  updateBoard();
  // cellElements = document.querySelectorAll('.cell');

  // cellElements.forEach((cell, index) => cell.removeEventListener('click', (event) => {
  //   makeMove(index);
  // }));
  // cellElements.forEach((cell, index) => cell.addEventListener('click', (event) => {
  //   makeMove(index);
  // }));
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


// генерация игрового поля
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

// обновление размера поля
function changeBoardSize(newSize) {
  size = newSize;
  generateField();
}


ws.onmessage = message => {
  const response = JSON.parse(message.data);
  //.log("From server: ", response);

  // Обработка входа игрока
  if (response.method === "join") {
    symbol = response.symbol;
    turn = response.turn;
    size = response.size === 0 ? 3 : response.size;
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

  }

  // Выведем сообщение об исходе схватки
  if (response.method === "result") {
    field = response.field;
    updateBoard();
    isGameActive = false;
    setTimeout(() => {
      messageElement.textContent = response.message;
    }, 100);
    removeCellEvent();
  }

  // Выведем сообщение о выходе оппонента
  if (response.method === "left") {
    isGameActive = false;
    messageElement.textContent = response.message+"; Refresh page to start new game";
    removeCellEvent();
  }

  // Хосту отрисуем кнопки изменения визуала игры
  if (response.method === "isHost") {
    buttonContainer.style.display = 'block';
    buttonImg.style.display = 'block';
    
    isHost = true;
  }

  if (response.method === "hostReady") {
    isHostReady = true;
    selectedCategory = response.selectedCategory;
    handleImageChange();
    updateMessage();
  }

  if (response.method === "resize") {
    changeBoardSize(response.size);
  }
};

// обработка нажатия на клетку
function makeMove(index) {
  if (!isGameActive || field[index] !== "") {
    return;
  }
  isGameActive = false;
  field[index] = symbol;
  ws.send(JSON.stringify({
    "method": "move",
    "symbol": symbol,
    "field": field,
    "size": size,
  }));
}


// обновление доски
function updateBoard() {
  cellElements.forEach((cell, index) => {
    // если выбраны картинки вместо стока
    if (isCustom) {
      if (field[index] !== "") {
        cell.classList.remove(field[index] + "-img"); // Убираем текущий класс суффикса -img
        cell.classList.remove(field[index]); // Убираем текущий класс
        updateBackgroundImages();
        //console.log("Custom true", cell.classList);

        cell.classList.add(field[index] + "-img"); // Добавляем соответствующий класс суффикса -img
      }
    } else {
      if (field[index] !== "") {
        cell.classList.remove(field[index]); // Убираем текущий класс поля
        cell.classList.remove(field[index] + "-img"); // Убираем текущий класс суффикса -img
        // console.log("Custom false", cell.classList);
        cell.classList.add(field[index]); // Возвращаем сток
      }
    }
  });
}



// функция обновления состояния игры
function updateMessage() {
  //console.log(isHostReady);
  if (isHostReady) {
    addCellEvent();
    if (symbol === turn) {
      messageElement.textContent = "move";
      handleDisplayBlock();
    } else {
      messageElement.textContent = `waiting ${turn}...`;
      handleDisplayBlock();
    }
  } else {
    messageElement.textContent = "Wait for setup, turn on sound"; // Новое сообщение для ожидания готовности хоста
    buttonContainer.style.display = isHost === true ? 'block' : 'none';
    buttonImg.style.display = isHost === true ? 'block' : 'none';
    const readyButton = document.getElementById('readyButton');
    readyButton.disabled = false;
    buttonContainer.style.opacity = 1;
    buttonImg.style.opacity = 1;
    removeCellEvent();
  }
};


function handleDisplayBlock() {
  buttonContainer.style.display = 'none';
  buttonImg.style.display = 'none';
}

function removeCellEvent() {
  // Устанавливаем pointer-events: none для каждой ячейки
  cellElements.forEach((cell) => {
    cell.style.pointerEvents = 'none';
  });
  cellElements.forEach((cell, index) => cell.removeEventListener('click', () => {
    makeMove(index);
  }));
}

function addCellEvent(){
  cellElements = document.querySelectorAll('.cell');

  cellElements.forEach((cell, index) => cell.removeEventListener('click', (event) => {
    makeMove(index);
  }));
  cellElements.forEach((cell, index) => cell.addEventListener('click', (event) => {
    makeMove(index);
  }));
}