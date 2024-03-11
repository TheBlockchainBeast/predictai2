const { Telegraf, Markup, Scenes, session } = require('telegraf');
const axios = require('axios');
const fs = require('fs');

// const token = '6655838669:AAFippXL6lWc2XgAn6nq36vX7zXzZpMt5Bc';
const token = '7112607792:AAGLgYyNDr-639Iqfxm-bNTcVsE19hFDO1g';
const bot = new Telegraf(token);

// Store alerts in memory
const alerts = {};

// const lockFilePath = '/tmp/bot_lock';

// if (fs.existsSync(lockFilePath)) {
//     console.error('Another instance is already running.');
//     process.exit(1);
// }

// fs.writeFileSync(lockFilePath, 'locked');

// process.on('SIGINT', () => {
//     fs.unlinkSync(lockFilePath);
//     process.exit();
// });

// Scene setup
const predictionScene = new Scenes.BaseScene('predictionScene');
const alertScene = new Scenes.BaseScene('alertScene');

predictionScene.enter((ctx) => {
    ctx.reply(`Excited to embark on a journey into the cryptoverse's next big thing? Type in the token address down below 👇 to ignite the forecasting adventure. Make sure it's a legitimate Ethereum Network address, and for the best outcomes, focus on tokens that have been in the market for at least three days. 🕒`,
        Markup.inlineKeyboard([Markup.button.callback('Cancel', 'cancel')]))
        .then((message) => {
            // Store the initial message ID for later deletion
            ctx.session.initialMessageId = message.message_id;
        });
});

predictionScene.on('text', async (ctx) => {
    const userResponse = ctx.message.text;

    if (userResponse.toLowerCase() === 'cancel') {
        ctx.telegram.deleteMessage(ctx.chat.id, ctx.session.initialMessageId);
        ctx.reply('Prediction canceled. Feel free to explore other features!');
        ctx.scene.leave();
    } else {
        ctx.telegram.deleteMessage(ctx.chat.id, ctx.session.initialMessageId);

        try {
            // Dexscreener API
            const dexscreenerApiUrl = `https://api.dexscreener.com/latest/dex/search?q=${userResponse}`;
            const dexscreenerResponse = await axios.get(dexscreenerApiUrl);

            if (dexscreenerResponse.data && dexscreenerResponse.data.pairs && dexscreenerResponse.data.pairs.length > 0) {
                const tokenData = dexscreenerResponse.data.pairs[0]; const dexscreener = dexscreenerResponse.data.pairs[0];

                // Log Dexscreener response for debugging
                console.log('Dexscreener Response:', dexscreenerResponse.data);

                let marketCapPredictionMessage = "";
                let predictedMarketCap = 0;

                // Check if dexscreener is not null before proceeding
                if (dexscreener) {
                    // Logic 1: Prediction based on historical data
                    const marketCapChange = parseFloat(tokenData.fdv) || 0;
                    const message1 =
                        marketCapChange > 0
                            ? `Positive market cap change observed. Expect potential growth.`
                            : marketCapChange < 0
                                ? `Negative market cap change observed. Expect potential decrease.`
                                : `Neutral market cap change observed.`;

                    // Logic 2: Prediction based on recent buy/sell activity
                    const buyCount = parseInt(tokenData.txns.h24.buys) || 0;
                    const sellCount = parseInt(tokenData.txns.h24.sells) || 0;
                    const netActivity = buyCount - sellCount;
                    const message2 =
                        netActivity > 0
                            ? `Positive buying activity observed. This might contribute to an increase in market cap.`
                            : netActivity < 0
                                ? `Negative selling activity observed. This might lead to a decrease in market cap.`
                                : `Neutral buying/selling activity observed.`;

                    // Logic 3: Prediction based on liquidity
                    const liquidity = parseFloat(tokenData.liquidity.usd) || 0;
                    const message3 =
                        liquidity > 100000
                            ? `High liquidity detected. This could contribute to a stable or growing market cap.`
                            : liquidity > 10000
                                ? `Moderate liquidity detected. Market cap may see some fluctuations.`
                                : `Low liquidity detected. Market cap might be more volatile.`;

                    // Logic 4: Prediction based on Trading Volume
                    const tradingVolume = parseFloat(tokenData.volume.h24) || 0;
                    const message4 =
                        tradingVolume > 1000000
                            ? `High trading volume detected. Anticipate significant market cap movements.`
                            : tradingVolume > 10000
                                ? `Moderate trading volume observed. Market cap may experience some activity.`
                                : `Low trading volume detected. Market cap might remain relatively stable.`;

                    // Randomly choose one of the three logics
                    const randomLogicIndex = Math.floor(Math.random() * 4);
                    switch (randomLogicIndex) {
                        case 0:
                            marketCapPredictionMessage = message1;
                            break;
                        case 1:
                            marketCapPredictionMessage = message2;
                            break;
                        case 2:
                            marketCapPredictionMessage = message3;
                            break;
                        case 3:
                            marketCapPredictionMessage = message4;
                            break;
                        default:
                            marketCapPredictionMessage = "Market cap prediction not available.";
                    }

                } else {
                    // Handle the case where dexscreener is null
                    console.error("dexscreener is null");
                    // You might want to set a default message or handle the null case here
                    marketCapPredictionMessage = "Market cap prediction not available.";
                }


                // Calculate predicted market cap (adjust as needed)
                const currentMarketCap = parseFloat(tokenData.fdv) || 0;
                const marketCapAdjustment = Math.random() * 0.4 - 0.2; // Random adjustment between -20% to 20%
                predictedMarketCap = currentMarketCap * (1 + marketCapAdjustment);
                // Calculate the percentage change
                const percentageChange = ((predictedMarketCap - currentMarketCap) / currentMarketCap) * 100;

                // Calculate predicted circulating supply based on the provided formula: Market Cap / Price
                const currentPrice = parseFloat(tokenData.priceUsd) || 0;
                const predictedCirculatingSupply = predictedMarketCap / currentPrice;

                // Calculate predicted price based on the predicted circulating supply
                const predictedPrice = currentPrice * (1 + marketCapAdjustment); // Adjusted based on market cap adjustment

                // Calculate the percentage change for price
                const percentageChangePrice = ((predictedPrice - currentPrice) / currentPrice) * 100;

                // GoPlusLabs API using userResponse directly
                const gopluslabsApiUrl = `https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses=${userResponse}`;
                const gopluslabsResponse = await axios.get(gopluslabsApiUrl);

                // Log GoPlusLabs response for debugging
                console.log('GoPlusLabs Response:', gopluslabsResponse.data);

                const securityData = gopluslabsResponse.data.result[userResponse.toLowerCase()];

                const honeypotWarning = securityData.is_honeypot === '1' ? '🚨 This token is flagged as a honeypot! ' : '';
                const sameCreatorWarning = securityData.honeypot_with_same_creator === '1' ? 'Honeypot with the same creator detected! ' : '';
                const blacklistedWarning = securityData.is_blacklisted === '1' ? 'This token has a blacklist function! ' : '';
                const takeBackOwnershipWarning = securityData.can_take_back_ownership === '1' ? 'Owner can take back ownership! ' : '';
                const cannotSellAllWarning = securityData.cannot_sell_all === '1' ? 'Selling all tokens is restricted! ' : '';
                const cannotBuyWarning = securityData.cannot_buy === '1' ? 'Buying is restricted! ' : '';
                const hiddenOwnerWarning = securityData.hidden_owner === '1' ? 'Token has a hidden owner! ' : '';
                const transferPausableWarning = securityData.transfer_pausable === '1' ? 'Transfer is pausable. ' : '';

                let susCodeSection = '';

                if (
                    honeypotWarning.trim() ||
                    sameCreatorWarning.trim() ||
                    blacklistedWarning.trim() ||
                    takeBackOwnershipWarning.trim() ||
                    cannotSellAllWarning.trim() ||
                    cannotBuyWarning.trim() ||
                    hiddenOwnerWarning.trim() ||
                    transferPausableWarning.trim()
                ) {
                    susCodeSection = `<pre>${combineWarnings(honeypotWarning, sameCreatorWarning, blacklistedWarning, takeBackOwnershipWarning)}
${combineWarnings(cannotSellAllWarning, cannotBuyWarning, hiddenOwnerWarning, transferPausableWarning)}</pre>
`;
                }
                // Helper function to trim if available
                function combineWarnings(...warnings) {
                    const trimmedWarnings = warnings.map(warning => warning.trim()).filter(Boolean);
                    return trimmedWarnings.join('\n');
                }

                // Check if the security data for the provided token address exists
                if (securityData) {

                    // Helper function to format market cap
                    function formatMarketCap(marketCap) {
                        if (marketCap >= 1e6) {
                            return `$${(marketCap / 1e6).toFixed(2)}M`;
                        } else if (marketCap >= 1e3) {
                            return `$${(marketCap / 1e3).toFixed(2)}K`;
                        } else {
                            return `$${marketCap.toFixed(2)}`;
                        }
                    }

                    // Display relevant token data and security information to the user without link preview
                    const message = `
🪙 <strong>Token Name:</strong> ${tokenData.baseToken.name} (${tokenData.baseToken.symbol})
🏷 <strong>Price USD:</strong> $${tokenData.priceUsd}
🔖 <strong>Tax:</strong> ${securityData.buy_tax}% | ${securityData.sell_tax}%
⚡️ <strong>Total Supply:</strong> ${securityData.total_supply}
💧 <strong>Liquidity USD:</strong> $${tokenData.liquidity.usd}
📊 <strong>MarketCap:</strong> $${tokenData.fdv}
🧳 <strong>Holders:</strong> ${securityData.holder_count}

<strong>Price Changes:</strong>
  └<strong>5m:</strong> ${tokenData.priceChange.m5}% | <strong>1h:</strong> ${tokenData.priceChange.h1}% | <strong>24h:</strong> ${tokenData.priceChange.h24}%
<strong>Volume:</strong>
  └<strong>5m:</strong> $${tokenData.volume.m5}% | <strong>1h:</strong> $${tokenData.volume.h1} | <strong>24h:</strong> $${tokenData.volume.h24}
<strong>Buys/Sells:</strong>
  └<strong>5m:</strong> ${tokenData.txns.m5.buys}/${tokenData.txns.m5.sells} | <strong>1h:</strong> ${tokenData.txns.h1.buys}/${tokenData.txns.h1.sells} | <strong>24h:</strong> ${tokenData.txns.h24.buys}/${tokenData.txns.h24.sells}

${susCodeSection}
<strong>24H Predictions:</strong>
  └<strong>MarketCap:</strong> $${predictedMarketCap.toFixed(2)} (${percentageChange.toFixed(2)}%)
  └<strong>Price:</strong> $${predictedPrice.toFixed(6)} (${percentageChangePrice.toFixed(2)}%)

⚠️ ${marketCapPredictionMessage}
`;


                    const buttons = [
                        [
                            { text: '📈 Chart', url: 'https://www.dextools.io/app/en/ether/pair-explorer/' + userResponse },
                            { text: '🎨 Maestro', url: 'https://t.me/MaestroSniperBot?start=' + userResponse },
                        ],
                        [
                            { text: '🤖 Unibot', url: 'https://t.me/unibotsniper_bot?start=OttoBots-' + userResponse },
                            { text: '🔄 Trade', url: 'https://uniswap.trade/token/' + userResponse },
                        ]
                    ];

                    const keyboardMarkup = { inline_keyboard: buttons };


                    ctx.reply(message, { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: keyboardMarkup });

                } else {
                    ctx.reply('Security data not found for the provided token address. Please try again later.');
                }
            } else {
                ctx.reply('Token data not found. Please make sure the token address is valid.');
            }
        } catch (error) {
            console.error('Error fetching token data:', error);
            ctx.reply('Error fetching token data. Please try again later.');
        }

        ctx.scene.leave();
    }
});

alertScene.enter((ctx) => {
    ctx.reply(`Are you prepared to stay informed? Input the token address below 👇 to initiate the alert configuration. Make sure it's a legitimate Ethereum Network address. 🕒
\nTo create an alert, input the token address, followed by a comma, and specify the market cap value for the alert. For instance: tokenAddress, marketCapValue.
\nIf you've reconsidered, feel free to hit cancel. Let's gear up those alerts! 🔔`,
        Markup.inlineKeyboard([[Markup.button.callback('View Alerts', 'viewAlerts')], [Markup.button.callback('Cancel', 'cancelAlert')]]))
        .then((message) => {
            // Store the initial message ID for later deletion
            ctx.session.initialAlertMessageId = message.message_id;
        });
});

// Function to retrieve token data using the appropriate API
const getTokenData = async (tokenAddress) => {
    try {
        // Modify this with the appropriate API and logic for fetching token data
        const dexscreenerApiUrl = `https://api.dexscreener.com/latest/dex/search?q=${tokenAddress}`;
        const dexscreenerResponse = await axios.get(dexscreenerApiUrl);

        if (dexscreenerResponse.data && dexscreenerResponse.data.pairs && dexscreenerResponse.data.pairs.length > 0) {
            return dexscreenerResponse.data.pairs[0];
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching token data:', error);
        return null;
    }
};

// Create a wizard for alert setup
const alertWizard = new Scenes.WizardScene(
    'alert-wizard',
    (ctx) => {
        ctx.reply(`Enter the token address below to set up an alert. Ensure it's a valid Ethereum Network address.`);
        return ctx.wizard.next();
    },
    async (ctx) => {
        const tokenAddress = ctx.message.text.trim();

        try {
            // Retrieve token data using the appropriate API
            const tokenData = await getTokenData(tokenAddress);

            if (tokenData) {
                ctx.reply(`Great! Now, enter the market cap value for the alert.`);
                ctx.session.tokenAddress = tokenAddress;
                return ctx.wizard.next();
            } else {
                ctx.reply('Token data not found. Please make sure the token address is valid.');
                return ctx.scene.leave();
            }
        } catch (error) {
            console.error('Error fetching token data:', error);
            ctx.reply('Error fetching token data. Please try again later.');
            return ctx.scene.leave();
        }
    },
    async (ctx) => {
        const alertValue = parseFloat(ctx.message.text.trim());

        if (!isNaN(alertValue)) {
            try {
                // Retrieve token data using the appropriate API
                const tokenData = await getTokenData(ctx.session.tokenAddress);
                const initialMarketCap = parseFloat(tokenData.fdv) || 0;

                // Set up the alert for this user
                alerts[ctx.from.id] = alerts[ctx.from.id] || [];
                alerts[ctx.from.id].push({
                    tokenAddress: ctx.session.tokenAddress,
                    alertValue: alertValue,
                    initialMarketCap: initialMarketCap,
                });

                console.log('Alerts after addition:', alerts);

                ctx.reply(`🔔 Alert set for ${tokenData.baseToken.name} (${tokenData.baseToken.symbol}).
\nInitial market cap: $${initialMarketCap.toFixed(2)}
\nYou will be notified when the market cap reaches or exceeds $${alertValue.toFixed(2)}.`, Markup.inlineKeyboard([
                    Markup.button.callback('View Alerts', 'viewAlerts'),
                ]));
            } catch (error) {
                console.error('Error fetching token data:', error);
                ctx.reply('Error fetching token data. Please try again later.');
            }
        } else {
            ctx.reply('Invalid alert value. Please enter a valid number for the alert value.');
        }

        // Check for alerts when a new one is set
        checkAlerts(ctx);

        return ctx.scene.leave();
    }
);


// Helper function to format market cap
function formatMarketCap(marketCap) {
    if (marketCap >= 1e6) {
        return `$${(marketCap / 1e6).toFixed(2)}M`;
    } else if (marketCap >= 1e3) {
        return `$${(marketCap / 1e3).toFixed(2)}K`;
    } else {
        return `$${marketCap.toFixed(2)}`;
    }
}

// Function to check alerts and send notifications
const checkAlerts = async (ctx) => {
    const alertData = alerts[ctx.from.id];

    if (alertData && alertData.length > 0) {
        try {
            const dexscreenerApiUrl = `https://api.dexscreener.com/latest/dex/search?q=${alertData[0].tokenAddress}`;
            const dexscreenerResponse = await axios.get(dexscreenerApiUrl);

            if (dexscreenerResponse.data && dexscreenerResponse.data.pairs && dexscreenerResponse.data.pairs.length > 0) {
                const tokenData = dexscreenerResponse.data.pairs[0];
                const currentMarketCap = parseFloat(tokenData.fdv) || 0;

                const alert = alertData[0];
                const { alertValue, initialMarketCap } = alert;

                // Check the direction of the alert
                if ((initialMarketCap < alertValue && currentMarketCap >= alertValue) || (initialMarketCap > alertValue && currentMarketCap <= alertValue)) {
                    // Send alert notification
                    ctx.reply(`🚨 The market cap for ${tokenData.baseToken.name} (${tokenData.baseToken.symbol}) has reached or exceeded the set value of $${alertValue.toFixed(2)}.
                    \nInitial market cap: $${initialMarketCap.toFixed(2)}.`);

                    // Clear the alert data after sending the notification
                    delete alerts[ctx.from.id];
                }
            } else {
                ctx.reply('Token data not found. Please make sure the token address is valid.');
            }
        } catch (error) {
            console.error('Error fetching token data:', error);
            ctx.reply('Error fetching token data. Please try again later.');
        }
    }
};



// Command handler
bot.start((ctx) => {
    const welcomeMessage = `
Welcome to Predict AI Bot!
`;

    ctx.reply(welcomeMessage, Markup.keyboard([['Predict'], ['🚀 Alert']]).resize());
});

// Register the scenes
const stage = new Scenes.Stage([predictionScene, alertScene, alertWizard]);
bot.use(session());
bot.use(stage.middleware());

// Button handler - entering the alert scene
bot.hears('🚀 Alert', (ctx) => {
    ctx.scene.enter('alert-wizard');
});

// Inline button handler for canceling alerts
bot.action('cancelAlert', (ctx) => {
    ctx.deleteMessage(); // Delete the initial message
    ctx.reply('Alert setup canceled. Feel free to explore other features!');
    ctx.scene.leave();
});

// Inline button handler for viewing and deleting alerts
bot.action('viewAlerts', async (ctx) => {
    // Fetch and display the list of active alerts for the user
    const userAlerts = alerts[ctx.from.id];
    if (userAlerts && userAlerts.length > 0) {
        const alertList = [];

        for (let i = 0; i < userAlerts.length; i++) {
            const alert = userAlerts[i];
            try {
                // Fetch token data using the getTokenData function
                const tokenData = await getTokenData(alert.tokenAddress);

                if (tokenData) {
                    // Display alert with token name and a delete button
                    alertList.push(`🔔 ${tokenData.baseToken.name} (${tokenData.baseToken.symbol}): $${alert.alertValue.toFixed(2)}`);
                } else {
                    alertList.push(`🔔 Unknown Token: $${alert.alertValue.toFixed(2)}`);
                }
            } catch (error) {
                console.error('Error fetching token data:', error);
                alertList.push(`🔔 Unknown Token: $${alert.alertValue.toFixed(2)}`);
            }
        }

        // Display all alerts as individual messages
        ctx.reply(`Your Alerts:\n${alertList.join('\n')}`, {
            reply_markup: {
                inline_keyboard: alertList.map((alert, index) => [Markup.button.callback(alert, `deleteAlert_${index}`)]),
            },
        });
    } else {
        ctx.reply('You have no active alerts.');
    }
    ctx.deleteMessage(); // Delete the initial message

    // Inline button handler for deleting alerts
    bot.action(/deleteAlert_\d+/, (ctx) => {
        const index = parseInt(ctx.match[0].split('_')[1]);

        if (!isNaN(index) && index >= 0 && index < userAlerts.length) {
            // Delete the selected alert
            userAlerts.splice(index, 1);
            ctx.reply('Alert deleted successfully!');
        } else {
            ctx.reply('Invalid alert index.');
        }

        // After deleting, show the updated list of alerts
        ctx.scene.reenter();
    });

    ctx.scene.leave();
});



// Button handler - entering the scene
bot.hears('Predict', (ctx) => {
    ctx.scene.enter('predictionScene');
});

// Inline button handler for cancel
bot.action('cancel', (ctx) => {
    ctx.deleteMessage(); // Delete the initial message
    ctx.reply('Prediction canceled. Feel free to explore other features!');
    ctx.scene.leave();
});

// Start the bot
bot.launch({
    webhook: {
        domain: 'https://predictai.onrender.com',
        port: process.env.PORT || 3000,
    },
});
// bot.launch();