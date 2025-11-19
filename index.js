const { Client, GatewayIntentBits, MessageFlags } = require('discord.js');
const {
	discordToken,
	logInfo,
	logVerbose,
	logErrors,
	infoLogChannelId,
	errorLogChannelId,
} = require('./config.json');

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

const fs = require('fs');
const https = require('https');
const regex = new RegExp(/.*nexusmods\.com\/\w+\/mods\/\d+(\?.*)?/g);

const tokens = new Map();
let infoLogChannel = null;
let errorLogChannel = null;

client.once('clientReady', () => {
	fetchChannels()
		.then(() => {
			loadData();
		})
		.catch((err) => {
			logErrorMessage(`Error while fetching channels: ${err}`);
		});
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
				// Handles command '/nexus help'
				await interaction.reply(getCommandHelp());
			} else {
				// Handles all other non-authentication commands
				await interaction.deferReply();
				const reply = await handle(interaction);
				if (reply.length > 2000) {
					await interaction.editReply(
						'Text response is too long for Discord, sending in multiple parts',
					);
					let tempReply = '';
					const lines = reply.split('\n');
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
				// Handles command '/nexus auth help'
				interaction.reply(getAuthHelp());
			} else if (subcommand === 'check') {
				// Handles command '/nexus auth check'
				await interaction.deferReply({ flags: MessageFlags.Ephemeral });
				const user = interaction.user;
				checkAuthentication(user)
					.then((result) => {
						if (result === 'valid') {
							interaction.editReply({
								content: 'Your NexusMods API key is valid!',
							});
						} else if (result === 'invalid') {
							interaction.editReply({
								content:
									'Your NexusMods API key is invalid. Update it with `/nexus auth set <token>`. See `/nexus auth help` for more information',
							});
						} else if (result === 'null') {
							interaction.editReply({
								content:
									'You have not registered an API key with this bot. Set it with `/nexus auth set <token>`. See `/nexus auth help` for more information',
							});
						} else {
							interaction.editReply({
								content: 'This should not be able to happen. Contact AnOliveBranch to investigate',
							});
							logErrorMessage(
								`Impossible outcome with checkAuthentication: ${result}\nInteraction: ${interaction}`,
							);
						}
						if (logVerbose === 'true') {
							logInfoMessage(`Authentication check result for ${user.tag}: ${result}`);
						}
					})
					.catch((err) => {
						interaction.editReply({
							content: 'An error occured running this command',
						});
						logErrorMessage(
							`Error checking authentication for ${user.tag}: ${err}\nInteraction: ${interaction}`,
						);
					});
			} else if (subcommand === 'set') {
				// Handles command '/nexus auth set <token>'
				await interaction.deferReply({ flags: MessageFlags.Ephemeral });
				const token = interaction.options.getString('token');
				validateToken(token)
					.then((valid) => {
						if (valid) {
							tokens.set(interaction.user.id, token);
							saveData();
							interaction.editReply({
								content:
									'Your NexusMods API key has been validated and saved. Remove it with `/nexus auth remove`',
							});
							if (logVerbose === 'true') {
								logInfoMessage(`Authentication set for ${interaction.user.tag}`);
							}
						} else {
							interaction.editReply({
								content: 'Your NexusMods API token was invalid. Try again with a different token',
							});
						}
					})
					.catch((err) => {
						interaction.editReply({
							content: 'An error occured running this command',
						});
						logErrorMessage(
							`Error settings authentication for ${interaction.user}: ${err}\nInteraction: ${interaction}`,
						);
					});
			} else if (subcommand === 'remove') {
				// Handles command '/nexus auth remove'
				if (tokens.get(interaction.user.id) === undefined) {
					interaction.reply({
						content: 'You do not have a stored API key',
						flags: MessageFlags.Ephemeral,
					});
				} else {
					tokens.delete(interaction.user.id);
					saveData();
					interaction.reply({
						content: 'Your NexusMods API key is no longer being stored',
						flags: MessageFlags.Ephemeral,
					});
					if (logVerbose === 'true') {
						logInfoMessage(`Authentication data removed for ${interaction.user.tag}`);
					}
				}
			}
		}
	}
});

// Loads data from tokens.json to the tokens map
async function loadData() {
	logInfoMessage('Loading tokens to memory...');
	fs.promises
		.readFile('./tokens.json', 'utf8')
		.then((file) => {
			const tokenJSON = JSON.parse(file);
			for (const userID in tokenJSON) {
				tokens.set(userID, tokenJSON[userID]);
			}
			logInfoMessage('Tokens loaded to memory');
		})
		.catch((err) => {
			logErrorMessage(`Error loading tokens to memory: ${err}`);
		});
}

// Saves data from tokens map to tokens.json
async function saveData() {
	logInfoMessage('Saving data...');
	fs.promises
		.writeFile('./tokens.json', JSON.stringify(Object.fromEntries(tokens)))
		.then(() => {
			logInfoMessage('Tokens saved');
		})
		.catch((err) => {
			logErrorMessage(`Error saving data: ${err}`);
		});
}

// Builds the response to the '/nexus help' command
function getCommandHelp() {
	let help =
		'This bot is used to retrieve version and download link info from <https://nexusmods.com>\n';
	help += 'To get a download link, use the following format:\n';
	help += '`/nexus link <link> <version>`\n';
	help += 'To get a list of versions, use the following format:\n';
	help += '`/nexus versions <link>`\n';
	help +=
		'To comply with NexusMods policy, all users must authenticate themselves with the command:\n';
	help += '`/nexus auth set <token>`\n';
	help += 'See `/nexus auth help` for more information\n';
	help += 'This is an open source project licensed under the MIT License\n';
	help += 'The source code is available here: <https://github.com/AnOliveBranch/HermaeusMora>\n ';
	return help;
}

// Builds the response to the '/nexus auth help' command
function getAuthHelp() {
	let help =
		'NexusMods API Acceptable Use Policy (found here: <https://help.nexusmods.com/article/114-api-acceptable-use-policy>) ';
	help += 'requires all users to provide their own personal API key to this application for use. ';
	help +=
		'You can find your personal API key here: <https://www.nexusmods.com/users/myaccount?tab=api>, scroll to the bottom of the page\n';
	help += 'API keys can be registred to this bot using the following command:\n';
	help += '`/nexus auth set <token>`\n';
	help += 'This bot will verify the token with NexusMods and store it for future use\n';
	help +=
		'Note: The API key will be stored in plaintext by the bot, it is necessary for it to function\n';
	help += 'At any time, you may revoke this access in one of three ways:\n';
	help += '1) Use the command `/nexus auth remove` (**preferred**)\n';
	help += '2) Go to your NexusMods account API page and delete your personal API key\n';
	help += '3) Go to your NexusMods account API page and regenerate your personal API key\n';
	help +=
		'You can verify that your API key stored by the bot is still valid using the following command:\n';
	help += '`/nexus auth check`\n';
	help += 'The bot will not function without a stored API key for your user';
	return help;
}

// Checks if a user's authentication token is valid
async function checkAuthentication(user) {
	return new Promise((resolve, reject) => {
		const id = user.id;
		const token = tokens.get(id);
		if (token === undefined) {
			resolve('null');
		} else {
			validateToken(token)
				.then((response) => {
					if (response) {
						resolve('valid');
					} else {
						resolve('invalid');
					}
				})
				.catch((err) => {
					reject(err);
				});
		}
	});
}

// Calls NexusMods API to validate a token
async function validateToken(token) {
	return new Promise((resolve, reject) => {
		const options = {
			headers: {
				accept: 'application/json',
				apikey: token,
			},
		};
		if (logVerbose === 'true') {
			logInfoMessage('Contacting NexusMods to validate a token...');
		}
		https.get('https://api.nexusmods.com/v1/users/validate.json', options, (res) => {
			res.on('error', (err) => {
				reject(err);
			});

			let content = '';
			res.on('data', (chunk) => {
				content += chunk;
			});

			res.on('end', () => {
				const json = JSON.parse(content);
				const valid = !(
					Object.prototype.hasOwnProperty.call(json, 'message') &&
					json['message'] === 'Please provide a valid API Key'
				);
				if (logVerbose === 'true') {
					logInfoMessage(
						'Got response from NexusMods validating token: ' + (valid ? 'valid' : 'invalid'),
					);
				}
				resolve(valid);
			});
		});
	});
}

// Logs a message to the infoLogChannel, if enabled
async function logInfoMessage(message) {
	if (logInfo === 'true' && infoLogChannel !== null) {
		infoLogChannel.send(message).catch((err) => {
			logErrorMessage(`Caught error trying to info log ${message}\n${err}`);
		});
	}
}

// Logs a message to the errorLogChannel, if enabled
async function logErrorMessage(message) {
	if (logErrors === 'true' && errorLogChannel !== null) {
		errorLogChannel.send(message).catch((err) => {
			console.log(`Caught error trying to error log ${message}\n${err}`);
		});
	}
}

// Fetches infoLogChannel and errorLogChannel objects
async function fetchChannels() {
	if (logInfo) {
		if (infoLogChannelId !== '') {
			client.channels
				.fetch(infoLogChannelId)
				.then((channel) => {
					infoLogChannel = channel;
					logInfoMessage('Fetched and assigned info log channel');
				})
				.catch((err) => {
					console.log(err);
				});
		}
	}

	if (logErrors) {
		if (errorLogChannelId !== '') {
			client.channels
				.fetch(errorLogChannelId)
				.then((channel) => {
					errorLogChannel = channel;
					logInfoMessage('Fetched and assigned error log channel');
				})
				.catch((err) => {
					console.log(err);
				});
		}
	}
}

// Primary function for '/nexus link' and '/nexus versions'
// Needs to have logging implemented
async function handle(interaction) {
	const subcommand = interaction.options.getSubcommand();

	let link = interaction.options.getString('link');

	return new Promise((resolve) => {
		checkAuthentication(interaction.user).then((auth) => {
			if (auth === 'null') {
				resolve(
					'You do not have a stored NexusMods API key. Use `/nexus auth set <token>` to set it. See `/nexus auth help` for more information',
				);
				return;
			} else if (auth === 'invalid') {
				resolve(
					'Your stored NexusMods API key is invalid. Use `/nexus auth set <token>` to update it. See `/nexus auth help` for more information',
				);
				return;
			}

			if (link.split(' ').length > 1) {
				resolve(`Invalid link: \`${link}\``);
				return;
			}
			if (!link.match(regex)) {
				resolve(`Invalid link: \`${link}\``);
				return;
			}
			if (link.includes('https://')) {
				link = link.split('https://')[1];
			}

			const gameName = getGameName(link);
			const modId = getModId(link);
			getModFiles(gameName, modId, tokens.get(interaction.user.id))
				.then((files) => {
					getModInfo(gameName, modId, tokens.get(interaction.user.id))
						.then((info) => {
							if (subcommand === 'link') {
								const version = interaction.options.getString('version');
								resolve(getLink(version, files, info));
							} else if (subcommand === 'versions') {
								resolve(getVersions(files, info));
							}
						})
						.catch((err) => {
							resolve(err);
						});
				})
				.catch((err) => {
					resolve(err);
				});
		});
	});
}

// Builds a response for a link to a specific version of a mod
function getLink(version, filesJSON, info) {
	const fileIds = getFileIds(filesJSON, version);
	if (fileIds.length == 0) {
		return 'Could not find the specified version';
	}
	const modName = info.name;
	if (fileIds.length > 1) {
		let fileNames = '';
		for (let i = 0; i < fileIds.length; i++) {
			const fileId = fileIds[i][1][0];
			const gameId = fileIds[i][1][1];
			const uploadTime = fileIds[i][2].substring(0, 19);
			fileNames +=
				fileIds[i][0] +
				` ${uploadTime} <https://www.nexusmods.com/Core/Libs/Common/Widgets/DownloadPopUp?id=${fileId}&game_id=${gameId}>\n`;
		}
		return `Multiple files found for ${modName} version ${version}:\n${fileNames}`;
	} else {
		const fileId = fileIds[0][1][0];
		const gameId = fileIds[0][1][1];
		const fileName = fileIds[0][0];
		return `Download link to ${modName}: ${fileName} version ${version}\n<https://www.nexusmods.com/Core/Libs/Common/Widgets/DownloadPopUp?id=${fileId}&game_id=${gameId}>`;
	}
}

// Extracts the game name from a link
function getGameName(link) {
	return link.split('/')[1];
}

// Extracts the mod ID from a link
function getModId(link) {
	const modId = link.split('/')[3];
	if (modId.includes('?')) {
		return modId.split('?')[0].substring(0, modId.split('?')[0].length);
	} else {
		return modId;
	}
}

// Calls NexusMods API to get the mod files for a mod
async function getModFiles(gameName, modId, token) {
	const options = {
		headers: {
			accept: 'application/json',
			apikey: token,
		},
	};
	return new Promise((resolve, reject) => {
		if (logVerbose === 'true') {
			logInfoMessage(`Getting files for ${gameName} mod ${modId}...`);
		}
		https.get(
			`https://api.nexusmods.com/v1/games/${gameName}/mods/${modId}/files.json`,
			options,
			(res) => {
				res.on('error', (err) => {
					logErrorMessage(`Error getting mod files for ${gameName} mod ${modId}: ${err}`);
					reject('An unknown error occured retrieving this mod');
				});

				let content = '';
				res.on('data', (chunk) => {
					content += chunk;
				});

				res.on('end', () => {
					const files = JSON.parse(content);
					if (Object.prototype.hasOwnProperty.call(files, 'code')) {
						const errorCode = files.code;
						if (errorCode === 404) {
							reject('That mod does not exist');
						} else if (errorCode === 403) {
							reject('That mod is currently hidden');
						} else {
							console.log(files);
							reject('An unknown error occured retrieving this mod');
						}
						return;
					} else if (Object.prototype.hasOwnProperty.call(files, 'message')) {
						reject('An error occured');
						return;
					}

					resolve(files);
				});
			},
		);
	});
}

// Calls the NexusMods API to get mod info for a mod
async function getModInfo(gameName, modId, token) {
	const options = {
		headers: {
			accept: 'application/json',
			apikey: token,
		},
	};
	return new Promise((resolve, reject) => {
		if (logVerbose === 'true') {
			logInfoMessage(`Getting mod info for ${gameName} mod ${modId}...`);
		}
		https.get(
			`https://api.nexusmods.com/v1/games/${gameName}/mods/${modId}.json`,
			options,
			(res) => {
				res.on('error', (err) => {
					logErrorMessage(`Error getting mod info for ${gameName} mod ${modId}: ${err}`);
					reject('An unknown error occured retrieving mod info');
				});

				let content = '';
				res.on('data', (chunk) => {
					content += chunk;
				});

				res.on('end', () => {
					const info = JSON.parse(content);
					resolve(info);
				});
			},
		);
	});
}

// Extracts file IDs from a NexusMods response
function getFileIds(filesJSON, version) {
	if (version === 'none' || version === 'blank') {
		version = '';
	}
	const files = [];
	for (let i = 0; i < filesJSON.files.length; i++) {
		if (filesJSON.files[i].version == version) {
			files.push([
				filesJSON.files[i].name,
				filesJSON.files[i].id,
				filesJSON.files[i].uploaded_time,
			]);
		}
	}
	return files;
}

// Extracts a list of versions from a NexusMods response
function getVersions(filesJSON, info) {
	const versions = [];
	for (let i = 0; i < filesJSON.files.length; i++) {
		if (!versions.includes(filesJSON.files[i].version)) {
			versions.push(filesJSON.files[i].version);
		}
	}
	const versionString = `Found the following versions for ${info.name}: ${versions.join(', ')}`;
	return versionString;
}

client.login(discordToken);
