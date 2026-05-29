const fs = require('fs');
const path = require('path');
const { Collection, REST, Routes } = require('discord.js');

module.exports = (client) => {
  client.commands = new Collection();
  client.slashCommandsList = []; // Array to store raw JSON slash command data for registration

  const commandsPath = path.join(__dirname, '../commands');
  if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
  }

  // Recursive command loader
  const loadCommands = (dir) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        loadCommands(fullPath);
      } else if (file.endsWith('.js')) {
        try {
          const command = require(fullPath);
          
          if (!command || !command.name) {
            console.warn(`[Handlers] Command file "${file}" is missing a required "name" parameter.`);
            continue;
          }
          
          // Set in Collection
          client.commands.set(command.name, command);
          
          // If has aliases, store them or map them
          if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => {
              // We can set alias to point to the main command
              client.commands.set(alias, command);
            });
          }
          
          // If it is a Slash Command, add it to the registration list
          if (command.data && typeof command.data.toJSON === 'function') {
            client.slashCommandsList.push(command.data.toJSON());
          }
          
          console.log(`[Handlers] Loaded command: ${command.name}`);
        } catch (error) {
          console.error(`[Handlers] Error loading command at ${fullPath}:`, error);
        }
      }
    }
  };

  loadCommands(commandsPath);
  console.log(`[Handlers] Loaded ${client.commands.size} total prefix/alias associations.`);

  // Function to register slash commands (will be called in ready.js)
  client.deploySlashCommands = async () => {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (!token || !clientId) {
      console.warn('[Handlers] Skipping slash command deployment: DISCORD_TOKEN or CLIENT_ID environment variables are missing.');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
      console.log(`[Handlers] Started refreshing ${client.slashCommandsList.length} application (/) commands.`);

      if (guildId) {
        // Fast deployment for specific development guild
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: client.slashCommandsList }
        );
        console.log(`[Handlers] Successfully registered slash commands for developmental Guild ID: ${guildId}`);
      } else {
        // Global deployment (takes ~1-2 hours or instant in new discord.js v14 versions)
        await rest.put(
          Routes.applicationCommands(clientId),
          { body: client.slashCommandsList }
        );
        console.log('[Handlers] Successfully registered slash commands globally.');
      }
    } catch (error) {
      console.error('[Handlers] Error occurred during slash command registration:', error);
    }
  };
};
