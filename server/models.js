// models.js


const { Sequelize, DataTypes } = require('sequelize')

// Инициализация Sequelize с параметрами подключения к базе данных
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: 'localhost',
    username: 'postgres',
    password: '1',
    database: 'game_db',
});

// Таблица игроков
const Player = sequelize.define('Player', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

// Таблица игр
const Game = sequelize.define('Game', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    winnerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Player,
            key: 'id',
        },
    },
    loserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Player,
            key: 'id',
        },
    },
    draw: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
});


// Таблица рейтинга
const Rating = sequelize.define('Rating', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    playerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Player,
            key: 'id',
        },
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
});


// Определение отношения
Player.hasOne(Rating, { foreignKey: 'playerId' }); // Каждый игрок имеет только одну запись рейтинг
Rating.belongsTo(Player, { foreignKey: 'playerId' }); // Каждая запись рейтинга принадлежит одному игроку

// Синхронизация с базой данных, создание таблиц, если их нет
sequelize.sync();


// Экспорт моделей
module.exports={
    Player,
    Game,
    Rating,
    sequelize,
};
