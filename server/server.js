// server.js

// Подключение необходимых модулей
const express = require('express');  // Express - фреймворк для создания веб-приложений на Node.js
const http = require('http');        // Модуль для работы с HTTP
const socketIo = require('socket.io');  // Библиотека для работы с веб-сокетами
const { Player, Game, Rating, sequelize } = require('./models')

// Создание экземпляра Express приложения
const app = express();

// Создание HTTP сервера с использованием Express
const server = http.createServer(app);

// Создание экземпляра socket.io, привязанного к HTTP серверу
const io = socketIo(server);

// Использование middleware для обработки данных в формате JSON
app.use(express.json());

// Обработка GET запроса по корневому маршруту
app.get('/', (req, res) => {
  res.send('Hello, this is the Tic Tac Toe server!');
});

// Обработка события подключения к веб-сокету
io.on('connection', (socket) => {
  console.log('A user connected');

  // Обработка события отключения от веб-сокета
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Определение порта, на котором будет работать сервер
const PORT = process.env.PORT || 5000;

// Запуск сервера на указанном порту
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Маршрут для получения списка игроков
app.get('/api/players', async (req, res) => {
  try {
    // 
    const players = await Player.findAll({
      order: [['id', 'ASC']],
    })

    // ответ списком игроков в формате JSON клиенту
    res.json(players);
  } catch (error) {
    // Обработка ошибок 
    console.error('Error retrieving players', error);
    res.status(500).send('Internal Server Error');
  }
});



// Маршрут для получения рейтинга игроков
app.get('/api/players_rating', async (req, res) => {
  try {
    // 
    const rating = await Rating.findAll({
      order: [['rating', 'DESC']],
    })

    // ответ списком игроков в формате JSON клиенту
    res.json(rating);
  } catch (error) {
    // Обработка ошибок 
    console.error('Error retrieving players rating', error);
    res.status(500).send('Internal Server Error');
  }
});

// Маршрут для создания нового игрока
app.post('/api/players', async (req, res) => {
  // Извлекаем данные о новом игроке из тела запроса
  const { username } = req.body;


  // Проверка, что поле 'username' присутствует в теле запроса
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Подключаемся к базе данных и создаем нового игрока
    const newPlayer = await Player.create({ username });

    // Отправляем данные нового игрока в формате JSON клиенту
    res.status(201).json(newPlayer);
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Маршрут для получения рейтинга игрока по его ID
app.get('/api/players/:id/rating', async (req, res) => {
  // Извлекаем ID игрока из параметра маршрута
  const playerId = req.params.id;

  // Проверка, что параметр ID присутствует
  if (!playerId || isNaN(playerId)) {
    return res.status(400).json({ error: 'Invalid Player ID' });
  }


  try {
    // Подключаемся к базе данных и находим игрока по его ID
    const player = await Player.findByPk(playerId);

    // Если игрок с указанным ID не найден, отправляем ошибку 404
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Найдем рейтинг игрока по playerId в таблице Rating
    const rating = await Rating.findOne({
      where: { playerId: playerId },
    });

    // Отправим JSON-ответ с рейтингом игрока
    res.json({ rating: rating ? rating.rating : null });
  } catch (error) {
    // Обработка ошибок
    console.error('Error retrieving player rating:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Маршрут для создания новой игры
app.post('/api/games', async (req, res) => {

  // Извлекаем данные о новой игре из тела запроса
  const { winnerId, loserId, draw } = req.body;

  // Проверка, что все необходимые поля присутствуют
  if (!winnerId || !loserId || draw === undefined) {
    return res.status(400).json({ error: 'Invalid game data' });
  }

  try {
    // Проверка наличия игроков
    const winnerExists = await Player.findByPk(winnerId);
    const loserExists = await Player.findByPk(loserId);


    if (!winnerExists || !loserExists) {
      return res.status(404).json({ error: 'One or both players do not exist' });
    }

    await sequelize.transaction(async (t) => {
      // Создание новой игры
      const newGame = await Game.create({ winnerId, loserId, draw }, { transaction: t });

      // Обновление рейтинга при окончании игры
      await Rating.increment('rating', { by: 1, where: { playerId: winnerId }, transaction: t });
      await Rating.decrement('rating', { by: 1, where: { playerId: loserId }, transaction: t });

      // Отправка данных новой игры в формате JSON клиенту
      res.status(201).json(newGame);
    });
  } catch (error) {
    // Обработка ошибок
    console.error('Error creating game:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Маршрут для получения списка игр
app.get('/api/games', async (req, res) => {
  try {
    // Подключаемся к базе данных и получаем список игр
    const games = await Game.findAll();

    // Отправляем список игр в формате JSON клиенту
    res.json(games);
  } catch (error) {
    // Обработка ошибок, если они возникли во время выполнения запроса
    console.error('Error retrieving games:', error);
    res.status(500).send('Internal Server Error');
  }
});

