require('dotenv').config();

module.exports = {
username: process.env.DB_USERNAME,
password: process.env.DB_PASSWORD,
database: process.env.DB_DATABASE,
host: process.env.DB_HOST,
dialect: 'mysql',
logging: process.env.NODE_ENV === 'development' ? console.log : ''
};