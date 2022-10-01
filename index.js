const {
    Client,
    GatewayIntentBits
} = require('discord.js');
const {
    discordToken
} = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const fs = require('fs');
const https = require('https');

let tokens = new Map();

client.once('ready', () => {
    loadData();
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('Nexus Mods');
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    const { commandName } = interaction;

    if (commandName === 'nexus') {
        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        if (group === null) {
            if (subcommand === 'help') {
                await interaction.reply(getCommandHelp());
            }
        } else if (group === 'auth') {
            if (subcommand === 'help') {
                await interaction.reply(getAuthHelp());
            } else if (subcommand === 'check') {
                let user = interaction.user;
                const authResult = await checkAuthentication(user);
                if (authResult === 'valid') {
                    await interaction.reply('Your NexusMods API key is valid!');
                } else if (authResult === 'invalid') {
                    await interaction.reply('Your NexusMods API key is invalid. Update it with `/nexus auth set <token>`. See `/nexus auth help` for more information');
                } else if (authResult === 'null') {
                    await interaction.reply('You have not registered an API key with this bot. Set it with `/nexus auth set <token>`. See `/nexus auth help` for more information')
                } else {
                    await interaction.reply('This shouldn\'t be able to happen. Contact @Robotic#1111 to investigate');
                    console.log(authResult);
                }
            } else if (subcommand === 'set') {
                const token = interaction.options.getString('token');
                const valid = await validateToken(token);
                if (valid) {
                    tokens.set(interaction.user.id, token);
                    saveData();
                    await interaction.reply('Your NexusMods API key has been validated and saved. Remove it with `/nexus auth remove`');
                } else {
                    await interaction.reply('Your NexusMods API token was invalid. Try again with a different token');
                }
            } else if (subcommand === 'remove') {
                if (tokens.get(interaction.user.id) === undefined) {
                    await interaction.reply('You do not have a stored API key');
                } else {
                    tokens.delete(interaction.user.id);
                    saveData();
                    await interaction.reply('Your NexusMods API key is no longer being stored');
                }
            }
        }
    }
});

async function loadData() {
    if (fs.existsSync('./tokens.json')) {
        const tokensFile = await fs.promises.readFile('./tokens.json', 'utf8');
        tokenJSON = JSON.parse(tokensFile);
        for (const userID in tokenJSON) {
            tokens.set(userID, tokenJSON[userID]);
        }
    }
}

async function saveData() {
    await fs.writeFile('./tokens.json', JSON.stringify(Object.fromEntries(tokens)), (err) => {
        if (err) {
            console.log(err);
        }
    });
}

function getCommandHelp() {
    let help = 'This bot is used to retrieve version and download link info from <https://nexusmods.com>\n';
    help += 'To get a download link, use the following format:\n';
    help += '`/nexus link <link> <version>`\n';
    help += 'To get a list of versions, use the following format:\n';
    help += '`/nexus versions <link>`\n';
    help += 'To comply with NexusMods policy, all users must authenticate themselves with the command:\n';
    help += '`/nexus auth set <token>`\n';
    help += 'See `/nexus auth help` for more information\n';
    help += 'This is an open source project licensed under the MIT License\n';
    help += 'The source code is available here: <https://github.com/RyanEHenderson/HermaeusMora>\n ';
    return help;
}

function getAuthHelp() {
    let help = 'NexusMods API Acceptable Use Policy (found here: <https://help.nexusmods.com/article/114-api-acceptable-use-policy>) ';
    help += 'requires all users to provide their own personal API key to this application for use. ';
    help += 'You can find your personal API key here: <https://www.nexusmods.com/users/myaccount?tab=api>\n';
    help += 'API keys can be registred to this bot using the following command:\n';
    help += '`/nexus auth set <token>`\n';
    help += 'This bot will verify the token with NexusMods and store it for future use\n';
    help += 'Note: The API key will be stored in plaintext by the bot, it is necessary for it to function\n';
    help += 'At any time, you may revoke this access in one of three ways:\n';
    help += '1) Use the command `/nexus auth remove` (**preferred**)\n';
    help += '2) Go to your NexusMods account API page and delete your personal API key\n';
    help += '3) Go to your NexusMods account API page and regenerate your personal API key\n';
    help += 'You can verify that your API key stored by the bot is still valid using the following command:\n';
    help += '`/nexus auth check`\n';
    help += 'The bot will not function without a stored API key for your user';
    return help;
}

async function checkAuthentication(user) {
    return new Promise((resolve) => {
        const id = user.id;
        const token = tokens.get(id);
        if (token === undefined) {
            resolve('null');
        } else {
            validateToken(token).then((response) => {
                if (response) {
                    resolve('valid');
                } else {
                    resolve('invalid');
                }
            }).catch((err) => {
                console.log(err);
                reject(err);
            });
        }
    });
}

async function validateToken(token) {
    return new Promise((resolve, reject) => {
        let options = {
            headers: {
                accept: 'application/json',
                apikey: token
            }
        }
        https.get('https://api.nexusmods.com/v1/users/validate.json', options, (res) => {
            res.on('error', (err) => {
                console.log(err);
                reject(err);
            });
    
            let content = '';
            res.on('data', (chunk) => {
                content += chunk;
            });
    
            res.on('end', () => {
                let json = JSON.parse(content);
                if (json.hasOwnProperty('message') && json['message'] === 'Please provide a valid API Key') {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    });
}

client.login(discordToken);