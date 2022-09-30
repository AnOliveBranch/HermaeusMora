const { REST, SlashCommandBuilder, Routes } = require('discord.js');
const { clientId, guildId, discordToken } = require('./config.json');

const commands = [
	new SlashCommandBuilder().setName('nexus')
        .setDescription('Main command for interacting with the NexusMods API')
        .addSubcommand(subcommand => 
            subcommand
            .setName('help')
            .setDescription('Displays information about the /nexus command')
            ),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(discordToken);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);
