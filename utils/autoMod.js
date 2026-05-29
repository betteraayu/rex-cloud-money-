const { PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const embeds = require('./embeds');

// Spam tracking cache: userId -> Array of message timestamps
const spamCache = new Map();

// Banned words (common host spam / scam terms)
const BANNED_WORDS = ['discord.gg/', 'free nitro', 'cheap hosting bypass', 'chargeback hack', 'buy premium free'];

module.exports = {
  async checkMessage(message, client) {
    if (message.author.bot || !message.guild) return false;
    
    // Staff are immune
    if (message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return false;
    }

    const content = message.content.toLowerCase();
    let violation = null;
    let reason = "";

    // 1. Anti-Link Filter
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    if (linkRegex.test(content)) {
      violation = "Anti-Link Policy";
      reason = "Posting links is restricted to staff members only to prevent phishing.";
    }

    // 2. Swear/Scam Word Filter
    if (!violation) {
      for (const word of BANNED_WORDS) {
        if (content.includes(word)) {
          violation = "Banned Terminology";
          reason = `Your message contains restricted terminology: \`${word}\``;
          break;
        }
      }
    }

    // 3. Anti-Spam Filter
    if (!violation) {
      const now = Date.now();
      if (!spamCache.has(message.author.id)) {
        spamCache.set(message.author.id, []);
      }
      
      const timestamps = spamCache.get(message.author.id);
      timestamps.push(now);
      
      // Filter out timestamps older than 3 seconds
      const activeTimestamps = timestamps.filter(t => now - t < 3000);
      spamCache.set(message.author.id, activeTimestamps);
      
      if (activeTimestamps.length > 5) {
        violation = "Anti-Spam Filter";
        reason = "Sending more than 5 messages in 3 seconds is prohibited.";
      }
    }

    // Process violation
    if (violation) {
      // Delete user message
      await message.delete().catch(() => {});

      // Send warning response to user
      const warningEmbed = embeds.error(
        "Auto-Moderation Triggered",
        `${message.author}, your message was deleted due to: **${violation}**.\n\n*Reason:* ${reason}`,
        client
      );

      const alertMsg = await message.channel.send({ embeds: [warningEmbed] }).catch(() => null);
      if (alertMsg) {
        setTimeout(() => alertMsg.delete().catch(() => {}), 6000);
      }

      // Log to server audit channel
      const guildConfig = db.getGuildConfig(message.guild.id);
      if (guildConfig && guildConfig.log_channel_id) {
        const logChannel = await message.guild.channels.fetch(guildConfig.log_channel_id).catch(() => null);
        if (logChannel) {
          const logEmbed = embeds.error(
            "Auto-Moderation Alert",
            null,
            client
          )
          .addFields(
            { name: "User", value: `${message.author} (${message.author.tag})`, inline: true },
            { name: "Channel", value: `${message.channel}`, inline: true },
            { name: "Infraction", value: `\`${violation}\``, inline: true },
            { name: "Content", value: `\`\`\`${message.content.substring(0, 1000)}\`\`\`` },
            { name: "Action Taken", value: "Message automatically deleted and user warned." }
          );

          logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }
      return true; // Violation handled
    }

    return false; // Normal message
  }
};
