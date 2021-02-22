const express = require('express');
const app = express();
const fs = require('fs');
const logger = require('./Logger');

// Initialize Modules
fs.readdirSync(`${__dirname}/modules`)
    .filter(file => file.substr(0, 1) !== '.')
    .forEach(file => {
        require(`./modules/${file}`);
        logger.info(`${file} Module Initialized`);
    });

module.exports = app;
