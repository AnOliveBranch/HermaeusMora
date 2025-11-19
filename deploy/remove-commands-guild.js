// THIS SCRIPT HAS NOT BEEN UPDATED AND IS LIKELY NONFUNCTIONAL

const { guildId, discordToken } = require('../config.json');

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
	console.log(`Logged in as ${client.user.tag}`);
	const guild = client.guilds.cache.get(guildId);
	guild.commands.fetch().then((commands) => {
		commands.forEach((command) => {
			guild.commands
				.delete(command.id)
				.then(() => {
					console.log(`Deleted command ${command.id} (${command.name}) from ${guildId}`);
				})
				.catch((err) => {
					console.log(err);
				});
		});
	});
});

client.login(discordToken);
