const {
    Client,
    GatewayIntentBits
} = require('discord.js');
const {
    discordToken,
    logInfo,
    logErrors,
    infoLogChannelId,
    errorLogChannelId
} = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const fs = require('fs');
const https = require('https');
const regex = new RegExp(/.*nexusmods\.com\/\w+\/mods\/\d+(\?.*)?/g);

let tokens = new Map();
let infoLogChannel = null;
let errorLogChannel = null;

client.once('ready', () => {
    loadData();
    fetchChannels();
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
            } else {
                await interaction.deferReply();
                let reply = await handle(interaction);
                if (reply.length > 2000) {
                    await interaction.editReply('Text response is too long for Discord, sending in multiple parts');
                    let tempReply = '';
                    let lines = reply.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        if (tempReply.length + lines[i].length > 2000) {
                            await interaction.followUp(tempReply);
                            tempReply = '';
                        }
                        tempReply += lines[i] + '\n';
                    }
                    await interaction.followUp(tempReply);
                } else {
                    await interaction.editReply(reply);
                }
            }
        } else if (group === 'auth') {
            if (subcommand === 'help') {
                await interaction.reply(getAuthHelp());
            } else if (subcommand === 'check') {
                let user = interaction.user;
                const authResult = await checkAuthentication(user);
                if (authResult === 'valid') {
                    await interaction.reply({ content: 'Your NexusMods API key is valid!', ephemeral: true });
                } else if (authResult === 'invalid') {
                    await interaction.reply({ content: 'Your NexusMods API key is invalid. Update it with `/nexus auth set <token>`. See `/nexus auth help` for more information', ephemeral: true });
                } else if (authResult === 'null') {
                    await interaction.reply({ content: 'You have not registered an API key with this bot. Set it with `/nexus auth set <token>`. See `/nexus auth help` for more information', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'This shouldn\'t be able to happen. Contact @Robotic#1111 to investigate', ephemeral: true });
                    console.log(authResult);
                }
            } else if (subcommand === 'set') {
                const token = interaction.options.getString('token');
                const valid = await validateToken(token);
                if (valid) {
                    tokens.set(interaction.user.id, token);
                    saveData();
                    await interaction.reply({ content: 'Your NexusMods API key has been validated and saved. Remove it with `/nexus auth remove`', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Your NexusMods API token was invalid. Try again with a different token', ephemeral: true });
                }
            } else if (subcommand === 'remove') {
                if (tokens.get(interaction.user.id) === undefined) {
                    await interaction.reply({ content: 'You do not have a stored API key', ephemeral: true });
                } else {
                    tokens.delete(interaction.user.id);
                    saveData();
                    await interaction.reply({ content: 'Your NexusMods API key is no longer being stored', ephemeral: true });
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
    help += 'You can find your personal API key here: <https://www.nexusmods.com/users/myaccount?tab=api>, scroll to the bottom of the page\n';
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

async function handle(interaction) {
    let subcommand = interaction.options.getSubcommand();

    let link = interaction.options.getString('link');

    return new Promise((resolve, reject) => {
        checkAuthentication(interaction.user).then((auth) => {
            if (auth === 'null') {
                resolve('You do not have a stored NexusMods API key. Use `/nexus auth set <token>` to set it. See `/nexus auth help` for more information');
                return;
            } else if (auth === 'invalid') {
                resolve('Your stored NexusMods API key is invalid. Use `/nexus auth set <token>` to update it. See `/nexus auth help` for more information');
                return;
            }
        });

        if (link.split(' ').length > 1) {
            resolve(`Invalid link: \`${link}\``);
            return;
        }
        if (!link.match(regex)) {
            resolve(`Invalid link: \`${link}\``);
            return;
        }
        let gameName = getGameName(link);
        let modId = getModId(link);
        getModFiles(gameName, modId, tokens.get(interaction.user.id)).then((files) => {
            getModInfo(gameName, modId, tokens.get(interaction.user.id)).then((info) => {
                if (subcommand === 'link') {
                    let version = interaction.options.getString('version');
                    resolve(getLink(version, files, info));
                } else if (subcommand === 'versions') {
                    resolve(getVersions(files, info));
                }
            }).catch(err => {
                resolve(err);
            });
        }).catch(err => {
            resolve(err);
        });
    });
}

function getLink(version, filesJSON, info) {
    let fileIds = getFileIds(filesJSON, version);
    if (fileIds.length == 0) {
        return 'Could not find the specified version';
    }
    let modName = info.name;
    if (fileIds.length > 1) {
        let fileNames = '';
        for (let i = 0; i < fileIds.length; i++) {
            let fileId = fileIds[i][1][0];
            let gameId = fileIds[i][1][1];
            let uploadTime = fileIds[i][2].substring(0, 19);
            fileNames += fileIds[i][0] + ` ${uploadTime} <https://www.nexusmods.com/Core/Libs/Common/Widgets/DownloadPopUp?id=${fileId}&game_id=${gameId}>\n`;
        }
        return (`Multiple files found for ${modName} version ${version}:\n${fileNames}`);
    } else {
        let fileId = fileIds[0][1][0];
        let gameId = fileIds[0][1][1];
        let fileName = fileIds[0][0];
        return (`Download link to ${modName}: ${fileName} version ${version}\n<https://www.nexusmods.com/Core/Libs/Common/Widgets/DownloadPopUp?id=${fileId}&game_id=${gameId}>`);
    }
};

function getGameName(link) {
    return link.split('/')[3];
}

function getModId(link) {
    let modId = link.split('/')[5];
    if (modId.includes('?')) {
        return modId.split('?')[0].substring(0, modId.split('?')[0].length);
    } else {
        return modId;
    }
}

async function getModFiles(gameName, modId, token) {
    let options = {
        headers: {
            accept: 'application/json',
            apikey: token
        }
    }
    return new Promise((resolve, reject) => {
        https.get(`https://api.nexusmods.com/v1/games/${gameName}/mods/${modId}/files.json`, options, (res) => {
            res.on('error', (err) => {
                console.log('!!!!!!!!!!!!!!!');
                console.log(err);
                reject('An unknown error occured retrieving this mod');
            });

            let content = '';
            res.on('data', (chunk) => {
                content += chunk;
            });

            res.on('end', () => {
                let files = JSON.parse(content);
                if (files.hasOwnProperty('code')) {
                    let errorCode = files.code;
                    if (errorCode === 404) {
                        reject('That mod does not exist');
                    } else if (errorCode === 403) {
                        reject('That mod is currently hidden');
                    } else {
                        console.log(files);
                        reject('An unknown error occured retrieving this mod');
                    }
                    return;
                } else if (files.hasOwnProperty('message')) {
                    reject('An error occured');
                    return;
                }

                resolve(files);
            });
        });
    });
};

async function getModInfo(gameName, modId, token) {
    let options = {
        headers: {
            accept: 'application/json',
            apikey: token
        }
    }
    return new Promise((resolve, reject) => {
        https.get(`https://api.nexusmods.com/v1/games/${gameName}/mods/${modId}.json`, options, (res) => {
            res.on('error', (err) => {
                console.log(err);
                reject('An unknown error occured retrieving mod info');
            });

            let content = '';
            res.on('data', (chunk) => {
                content += chunk;
            });

            res.on('end', () => {
                let info = JSON.parse(content);
                resolve(info);
            });
        });
    });
}

function getFileIds(filesJSON, version) {
    if (version === 'none' || version === 'blank') {
        version = '';
    }
    let files = [];
    for (let i = 0; i < filesJSON.files.length; i++) {
        if (filesJSON.files[i].version == version) {
            files.push([filesJSON.files[i].name, filesJSON.files[i].id, filesJSON.files[i].uploaded_time]);
        }
    }
    return files;
}

function getVersions(filesJSON, info) {
    let versions = [];
    for (let i = 0; i < filesJSON.files.length; i++) {
        if (!versions.includes(filesJSON.files[i].version)) {
            versions.push(filesJSON.files[i].version);
        }
    }
    let versionString = `Found the following versions for ${info.name}: ${versions.join(', ')}`;
    return versionString;
}

async function logInfoMessage(message) {
    if (logInfo && infoLogChannel !== null) {
        infoLogChannel.send(message).catch(err => {
            logErrorMessage(`Caught error trying to info log ${message}\n${err}`);
        });
    }
}

async function logErrorMessage(message) {
    if (logErrors && errorLogChannel !== null) {
        errorLogChannel.send(message).catch(err => {
            console.log(`Caught error trying to error log ${message}\n${err}`);
        });
    }
}

async function fetchChannels() {
    if (logInfo) {
        if (infoLogChannelId !== '') {
            client.channels.fetch(infoLogChannelId).then(channel => {
                infoLogChannel = channel;
                logInfoMessage('Fetched and assigned info log channel');
            }).catch(err => {
                console.log(err);
            });
        }
    }

    if (logErrors) {
        if (errorLogChannelId !== '') {
            client.channels.fetch(errorLogChannelId).then(channel => {
                errorLogChannel = channel;
                logErrorMessage('Fetched and assigned error log channel');
            }).catch(err => {
                console.log(err);
            });
        }
    }
}

client.login(discordToken);