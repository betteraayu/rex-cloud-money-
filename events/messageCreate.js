const db = require('../database/db');
const config = require('../config/config');
const embeds = require('../utils/embeds');
const cooldownHandler = require('../handlers/cooldownHandler');
const autoMod = require('../utils/autoMod');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // Ignore bots and direct messages
    if (message.author.bot || !message.guild) return;

    // Run Auto Moderation checks
    const wasModerated = await autoMod.checkMessage(message, client);
    if (wasModerated) return;

    // Get guild specific settings (or insert default)
    let guildConfig = db.getGuildConfig(message.guild.id);
    if (!guildConfig) {
      guildConfig = db.updateGuildConfig(message.guild.id, {});
    }

    const prefix = guildConfig.prefix || config.prefix;

    // Check if message starts with prefix
    if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;

    // Parse arguments and command name
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Find command by name or alias
    const command = client.commands.get(commandName);
    if (!command) return;

    // Permission checks (User Permissions)
    if (command.userPermissions && command.userPermissions.length > 0) {
      const missingPermissions = [];
      for (const perm of command.userPermissions) {
        if (!message.member.permissions.has(perm)) {
          missingPermissions.push(perm);
        }
      }

      if (missingPermissions.length > 0) {
        const errEmbed = embeds.error(
          "Permission Denied",
          `You require the following permission(s) to run this command:\n${missingPermissions.map(p => `\`${p}\``).join(', ')}`,
          client
        );
        return message.reply({ embeds: [errEmbed] }).then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
      }
    }

    // Cooldown Validation
    const timeLeft = cooldownHandler.checkCooldown(message, command);
    if (timeLeft > 0) {
      const waitEmbed = embeds.warning(
        "Cooldown Active",
        `Slow down! You are command-throttled. Please wait **${timeLeft.toFixed(1)}s** before calling \`${command.name}\` again.`,
        client
      );
      return message.reply({ embeds: [waitEmbed] }).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 4000);
      });
    }

    // Execute Command
    try {
      if (typeof command.execute === 'function') {
        await command.execute(message, args, client);
      } else {
        console.warn(`[Client] Command "${command.name}" does not support Prefix (r!) execution.`);
      }
    } catch (error) {
      console.error(`[Client] Error running command "${command.name}":`, error);
      const crashEmbed = embeds.error(
        "Execution Error",
        "An unexpected error occurred while executing this command. Staff have been alerted.",
        client
      );
      message.reply({ embeds: [crashEmbed] }).catch(() => {});
    }
  }
};
