# What is Hermaeus Mora?

Hermaeus Mora is a Discord bot that connects to the [NexusMods](https://nexusmods.com) API
to retrieve versioning and download link information for a given mod.

# How do I use it?

## For users:
Authenticate yourself to the bot using the `/nexus auth set <token>` command. [NexusMods API Acceptable Use Policy](https://help.nexusmods.com/article/114-api-acceptable-use-policy) requires all users to provide their own personal API key to this application for use. You can find your personal API key [here](https://www.nexusmods.com/users/myaccount?tab=api), scroll to the bottom of the page. You may need to create a personal API key if you have not done so before. Once your API key has been set with the bot and verified, you can use the `/nexus versions` and `/nexus link` commands to pull information from the NexusMods API. The bot **will not** function for you without authenticating your API key. Your API key will be stored in plaintext on the host running the bot, along with your Discord ID. Other information about your Nexus account is not stored. At any time, you can revoke access for the bot to use your NexusMods API key in one of three ways.
1. Use the command `/nexus auth remove` (**preferred**) - The bot will delete its record of your API key
2. Go to the NexusMods account API page and regenerate your personal API key - The bot will fail to validate the next time you attempt to do a request
3. Go to the NexusMods account API page and delete your personal API key - The bot will fail to validate the next time you attempt to do a request

## For developers:
Clone the respository and run `npm install` to install the required npm packages. Make a copy of [config_example.json](./config_example.json), naming it `config.json`. At the minimum, populate the `discordToken` and `clientId` fields. `guildId` will also need to be filled if you are going to deploy commands as guild-specific (handy during development testing). Various logging features exist to send logs to another discord channel. I recommend at least enabling error logging and setting a channel. Once you have configured the `config.json`, use node to deploy the commands, either [globally](./deploy/deploy-commands-global.js) or [guild](./deploy/deploy-commands-guild.js).

# Command List

* `/nexus help` - Displays help information for the `/nexus` command
* `/nexus auth help` - Displays information for authentication
* `/nexus auth set <token>` - Sets your API key to the provided token for bot use - REQUIRED FOR USE
* `/nexus auth check` - Checks if your stored API key is valid
* `/nexus auth remove` - Deletes your stored API key (if present)
* `/nexus versions <link>` - Lists available versions for a given mod
* `/nexus link <link> <version>` - Provides a direct download link for a specified version of a mod