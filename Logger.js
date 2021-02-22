'use strict';

const {createLogger, transports, format} = require('winston');

const logger = createLogger({
    format: format.combine(format.simple(), format.timestamp(),format.json(), format.printf(info => {
        switch (info.level) {
            case 'info':
                info.level = 'II';
                break;
            case 'warn':
                info.level = 'WW';
                break;
            case 'error':
                info.level = 'EE';
                break;
        }
        return `[${info.timestamp}][${info.level}][${info.message}] ${info.stack ? '[' + info.stack + ']' : ''}`
    })),
    transports: [
        new transports.File({
            filename: 'info.log',
            level: 'info',
        }),
        new transports.File({
            filename: 'error.log',
            level: 'error'
        }),
        new transports.Console()
    ]
});

// const uncaughtException = (reason) => console.error(`[UncaughtException] ${reason}`);
//
// process
//     .on('uncaughtException', uncaughtException)
//     .on('unhandledRejection', (reason, p) => {
//         uncaughtException(reason);
//     });

module.exports = logger;