const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
  // Base Premium Embed
  base(title, description, client = null) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTimestamp();

    if (title) embed.setTitle(`${config.emojis.rex} ${title}`);
    if (description) embed.setDescription(description);
    
    embed.setFooter({ 
      text: config.footerText, 
      iconURL: client?.user?.displayAvatarURL() || null 
    });

    return embed;
  },

  // Success Embed (Neon Teal)
  success(title, description, client = null) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTimestamp();

    if (title) embed.setTitle(`${config.emojis.success} ${title}`);
    if (description) embed.setDescription(description);
    
    embed.setFooter({ 
      text: config.footerText, 
      iconURL: client?.user?.displayAvatarURL() || null 
    });

    return embed;
  },

  // Error Embed (Neon Red)
  error(title, description, client = null) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTimestamp();

    if (title) embed.setTitle(`${config.emojis.error} ${title}`);
    if (description) embed.setDescription(description);
    
    embed.setFooter({ 
      text: config.footerText, 
      iconURL: client?.user?.displayAvatarURL() || null 
    });

    return embed;
  },

  // Warning Embed (Neon Yellow)
  warning(title, description, client = null) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTimestamp();

    if (title) embed.setTitle(`${config.emojis.warning} ${title}`);
    if (description) embed.setDescription(description);
    
    embed.setFooter({ 
      text: config.footerText, 
      iconURL: client?.user?.displayAvatarURL() || null 
    });

    return embed;
  },

  // Infographic / Detail Embed (Cyber Cyan)
  info(title, description, client = null) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTimestamp();

    if (title) embed.setTitle(`${config.emojis.info} ${title}`);
    if (description) embed.setDescription(description);
    
    embed.setFooter({ 
      text: config.footerText, 
      iconURL: client?.user?.displayAvatarURL() || null 
    });

    return embed;
  }
};
