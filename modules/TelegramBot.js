const TelegramBot = require('node-telegram-bot-api');
const logger = require('../Logger');
const Api = require('./BinanceApi');
const db = require('../models');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});
const initialButtons = [
    [{text: 'Set alert for pair by price'}],
    [{text: 'Show My Balance'}]
];
const ClientsApis = {
    '553262909': {
        apiKeyInitInProgress: false,
        apiKeyIsValid: true,
        api_key: process.env.BINANCE_API_KEY,
        secret: process.env.BINANCE_API_SECRET
    }
};

//api key and secret initializing command handler
bot.onText(/\/api_key (.+)/, async (msg, match) => {
    await initApiKey(msg, match[1]);

    bot.onText(/\/api_secret (.+)/, async (msg, match) => {
        await initSecretKey(msg, match[1]);
    });
});

//mark price alert initializing command handler
bot.onText(/\/alert (.+)/, async (msg, match) => {
    await StreamFuturesMarkPricesByClient(msg, match[1]);
});

bot.on('message', async (msg) => {
    console.log(msg);
    const {
        message_id,
        from: {id: user_id,is_bot,first_name,last_name,username,language_code},
        chat: {id: chat_id, type},
        date,
        text,
        entities
    } = msg;

    // Prevent emitting any messages when Api key initialization in progress or
    if (ClientsApis[msg.from.id] && !ClientsApis[msg.from.id].apiKeyInitInProgress) {
        await createMessage({message_id, user_id, text, type, date, entities});

        let userData = await findUserById({user_id});
        if (!userData) {
            await createUser({user_id, is_bot, first_name, last_name, username, language_code});
        }
    }

    switch (text) {
        case '/start':
            await startBot(msg);
            break;
        case 'Set alert for pair by price':
            await initPairPriceAlert(msg);
            break;
        case 'Show My Balance':
            await getClientBalance(msg);
            break;
        case 'Activate by keys':
            await initKeysActivation(msg);
            break;
        case 'Back':
            await goBack(msg);
            break;
        case 'Cancel':
            await initsCancel(msg);
            break;
        default:
            break;
    }
});

// db calls
const createMessage = (data) => db.messages.create(data);
const findUserById = (user_id) => db.users.findOne({where: user_id, raw: true});
const createUser = (data) => db.users.create(data);

const buttonGenerator = (msg, {keyboard}) => {
    return {
        // reply_to_message_id: msg.message_id,
        reply_markup: JSON.stringify({keyboard}
    )};
};

const initsCancel = async (msg) => {
    let responseMessage = 'Okay';
    if (ClientsApis[msg.from.id] && ClientsApis[msg.from.id].apiKeyInitInProgress) {
        ClientsApis[msg.from.id].apiKeyInitInProgress = false;
        ClientsApis[msg.from.id].apiKeyIsValid = false;
    }
    await bot.sendMessage(msg.from.id, responseMessage, buttonGenerator(msg, {keyboard: initialButtons}));
};
const goBack = async (msg) => {
    let responseMessage = 'Okay';
    await bot.sendMessage(msg.from.id, responseMessage, buttonGenerator(msg, {keyboard: initialButtons}));
};
const startBot = async (msg) => {
    let responseMessage = 'Hello, i am Binance bot and i can do some stuff';

    await bot.sendMessage(msg.chat.id, responseMessage, buttonGenerator(msg, {keyboard: initialButtons}));
};
const initKeysActivation = async (msg) => {
    ClientsApis[msg.from.id] = {apiKeyInitInProgress: true, apiKeyIsValid: false, api_key: '', secret: ''};

    let responseMessage = 'Okay, Send api key' + '\n' +
        'Example: /api_key YOUR_API_KEY';

    await bot.sendMessage(msg.from.id, responseMessage, buttonGenerator(msg, {keyboard: [['Cancel']]}));
};
const initApiKey = async (msg, key) => {
    ClientsApis[msg.from.id].api_key = key;

    let responseMessage = 'Now send secret key' + '\n' +
        'Example: /api_secret YOUR_SECRET_KEY' + '\n' +
        "Don't worry, I won't say anyone 🤫";

    await bot.sendMessage(msg.chat.id, responseMessage, buttonGenerator(msg, {keyboard: [['Cancel']]}));
};
const initSecretKey = async (msg, key) => {
    try {
        ClientsApis[msg.from.id].secret = key;
        ClientsApis[msg.from.id].apiKeyInitInProgress = false;

        const client = await Api.initClientByApiKeySecret(ClientsApis[msg.from.id]);
        if (client.status && client.status === 'error') {
            logger.error(client.msg);
            const exceptionMessage = 'Client initialization failed';

            const opts = buttonGenerator(msg, {keyboard: [['Activate by keys'], ['Back']]});
            throw {exceptionMessage, opts}
        }

        const accountInfo = await Api.accountInfo(client);
        if ((accountInfo.status && accountInfo.status === 'error') || (accountInfo.code && accountInfo.code === -2014)) {
            logger.error(accountInfo.msg);
            const exceptionMessage = 'Client initialization failed';

            const opts = buttonGenerator(msg, {keyboard: [['Activate by keys'], ['Back']]});
            throw {exceptionMessage, opts}
        }
        ClientsApis[msg.from.id].apiKeyIsValid = true;

        let responseMessage = 'Done! Now you can use Client based requests from me (✿◠‿◠)';
        const opts = buttonGenerator(msg, {keyboard: initialButtons});
        await bot.sendMessage(msg.chat.id, responseMessage, opts);
    } catch({exceptionMessage, opts}) {
        await bot.sendMessage(msg.from.id, exceptionMessage, opts);
    }
};
const getClientBalance = async (msg) => {
    try {
        if (!ClientsApis[msg.from.id] || !ClientsApis[msg.from.id].apiKeyIsValid) {
            const exceptionMessage = `
                Oh!, Looks like you dont have API and Secret keys initialized.
                That means you cannot use client based calls.
                To use that feature generate api key and secret from this page.
                https://www.binance.com/en/support/faq/360002502072-How-to-create-API`;

            const opts = buttonGenerator(msg, {keyboard: [['Activate by keys'], ['Back']]});
            throw {exceptionMessage, opts};
        }

        const client = await Api.initClientByApiKeySecret(ClientsApis[msg.from.id]);
        if (client.status && client.status === 'error') {
            logger.error(client.message);
            const exceptionMessage = 'Client initialization failed';

            const opts = buttonGenerator(msg, {keyboard: [['Activate by keys'], ['Back']]});
            throw {exceptionMessage, opts}
        }

        const account = await Api.accountInfo(client);
        if ((account.status && account.status === 'error') || (account.code && account.code === -1022)) {
            logger.error(account.msg);
            const exceptionMessage = 'Getting account balance failed';

            const opts = buttonGenerator(msg, {keyboard: [['Activate by keys'], ['Back']]});
            throw {exceptionMessage, opts}
        }

        let responseMessage = '';
        for (const el of account.assets) {
            responseMessage += `${el.asset}: ${el.walletBalance}\n`
        }

        await bot.sendMessage(msg.from.id, responseMessage, buttonGenerator(msg, {keyboard: initialButtons}));
    } catch({exceptionMessage, opts}) {
        await bot.sendMessage(msg.from.id, exceptionMessage, opts);
    }
};

const initPairPriceAlert = async (msg) => {
    try {
        if (!ClientsApis[msg.from.id] || !ClientsApis[msg.from.id].apiKeyIsValid) {
            const exceptionMessage = `
                Oh!, Looks like you dont have API and Secret keys initialized.
                That means you cannot use client based calls.
                To use that feature generate api key and secret from this page.
                https://www.binance.com/en/support/faq/360002502072-How-to-create-API`;

            const opts = buttonGenerator(msg, {keyboard: [['Activate by keys'], ['Back']]});
            throw {exceptionMessage, opts};
        }

        const client = await Api.initClientByApiKeySecret(ClientsApis[msg.from.id]);
        if (client.status && client.status === 'error') {
            logger.error(client.message);
            const exceptionMessage = 'Client initialization failed';

            const opts = buttonGenerator(msg, {keyboard: [['Activate by keys'], ['Back']]});
            throw {exceptionMessage, opts}
        }

        const account = await Api.accountInfo(client);
        if ((account.status && account.status === 'error') || (account.code && account.code === -1022)) {
            logger.error(account.msg);
            const exceptionMessage = 'Getting account balance failed';

            const opts = buttonGenerator(msg, {keyboard: [['Activate by keys'], ['Back']]});
            throw {exceptionMessage, opts}
        }

        let responseMessage = 'Please provide alert information message' + '\n' +
            'Example: /alert when BTC/USDT is 57000';

        const opts = buttonGenerator(msg, {keyboard: [['Cancel']]});
        await bot.sendMessage(msg.from.id, responseMessage, opts);
    } catch({exceptionMessage, opts}) {
        await bot.sendMessage(msg.from.id, exceptionMessage, opts);
    }
};
const StreamFuturesMarkPricesByClient = async (msg, match) => {
    try {
        if (!ClientsApis[msg.from.id] || !ClientsApis[msg.from.id].apiKeyIsValid) {
            const exceptionMessage = 'Please activate your api by keys';

            const opts = buttonGenerator(msg, {keyboard: [['Activate by keys'], ['Back']]});
            throw {exceptionMessage, opts};
        }

        const client = await Api.initClientByApiKeySecret(ClientsApis[msg.from.id]);
        if (client.status && client.status === 'error') {
            logger.error(client.message);
            const exceptionMessage = 'Client initialization failed';

            const opts = buttonGenerator(msg, {keyboard: [['Activate by keys'], ['Back']]});
            throw {exceptionMessage, opts}
        }

        match = match.replace(/\//g,'');
        let symbol = match.match(/([A-Z]+)/g)[0];
        let markPrice = match.match(/(\d+)/g)[0];

        if (!symbol) {
            symbol = 'BTCUSDT';
        }
        if (!markPrice) {
            let exceptionMessage = 'Please specify price';
            throw {exceptionMessage};
        }

        await bot.sendMessage(msg.from.id, `Okay, i will send you message, when ${symbol} will reach ${markPrice}`, buttonGenerator(msg, {keyboard: initialButtons}));


        console.log(symbol);
        let oldPrice;
        // streaming mark price by symbol
        await client.futuresMarkPriceStream(symbol, async (data, err) => {
            if (err) {
                logger.error(err);
            }
            if (!oldPrice) {
                oldPrice = parseInt(data.markPrice);
            }
            console.log(data.markPrice);

            if ((markPrice - parseInt(data.markPrice) < 0 && markPrice - oldPrice > 0) || (markPrice - parseInt(data.markPrice) > 0 && markPrice - oldPrice < 0)) {
                oldPrice = parseInt(data.markPrice);
                await bot.sendMessage(msg.from.id, `${symbol} reached ${markPrice}, price: ${parseInt(data.markPrice)}`, buttonGenerator(msg, {keyboard: initialButtons}));
            }
        }, '@1s');
    } catch({exceptionMessage, opts}) {
        await bot.sendMessage(msg.from.id, exceptionMessage, opts);
    }
};

module.exports = bot;