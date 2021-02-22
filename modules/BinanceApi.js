const Binance = require('node-binance-api');

let client;

module.exports = {
    initClientByApiKeySecret: async ({api_key, secret}) => {
        try {
            client = new Binance().options({
                APIKEY: api_key,
                APISECRET: secret
            });
            return client;
        } catch(err) {
            return {
                status: 'error',
                msg: err
            }
        }
    },
    accountInfo: async (client) => {
        try {
            return client.futuresAccount();
        } catch(err) {
            return {
                status: 'error',
                msg: err
            }
        }
    },
    futuresAccountBalance: async (client) => {
        try {
            return client.futuresAccountBalance();
        } catch(err) {
            return {
                status: 'error',
                msg: err
            };
        }
    }
};

