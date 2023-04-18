const { REST, SlashCommandBuilder, Routes } = require('discord.js');
const { clientId, guildId, discordToken } = require('../config.json');

const commands = [
    new SlashCommandBuilder()
        .setName('nexus')
        .setDescription('Main command for interacting with the NexusMods API')
        // Command: /nexus help
        .addSubcommand((subcommand) =>
            subcommand
                .setName('help')
                .setDescription('Displays information about the /nexus command')
        )
        // Command: /nexus link <link> <version>
        .addSubcommand((subcommand) =>
            subcommand
                .setName('link')
                .setDescription('Retrieves a download link from Nexus Mods')
                .addStringOption((option) =>
                    option
                        .setName('link')
                        .setDescription('The link to the mod')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('version')
                        .setDescription('The desired version of the mod')
                        .setRequired(true)
                )
        )
        // Command: /nexus versions <link>
        .addSubcommand((subcommand) =>
            subcommand
                .setName('versions')
                .setDescription('Retrieves a list of versions for a mod')
                .addStringOption((option) =>
                    option
                        .setName('link')
                        .setDescription('The link to the mod')
                        .setRequired(true)
                )
        )
        // Command group: /nexus auth
        .addSubcommandGroup((group) =>
            group
                .setName('auth')
                .setDescription('Authenticates you with NexusMods')
                // Command: /nexus auth help
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('help')
                        .setDescription(
                            'Displayes information about how to authenticate'
                        )
                )
                // Command: /nexus auth check
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('check')
                        .setDescription('Checks your authentication status')
                )
                // Command: /nexus auth set
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('set')
                        .setDescription('Command to setup your authentication')
                        // Option: /nexus auth set <token>
                        .addStringOption((option) =>
                            option
                                .setName('token')
                                .setDescription(
                                    'Your personal NexusMods API key'
                                )
                                .setRequired(true)
                        )
                )
                // Command: /nexus auth remove
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('remove')
                        .setDescription(
                            "Removes your API key from the bot's memory"
                        )
                )
        )
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(discordToken);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    .then((data) =>
        console.log(
            `Successfully registered ${data.length} application commands.`
        )
    )
    .catch(console.error);
