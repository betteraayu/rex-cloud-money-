const db = require('../database/db');
const embeds = require('../utils/embeds');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (message.partial || message.author?.bot || !message.guild) return;

    // Get log channel
    const guildConfig = db.getGuildConfig(message.guild.id);
    if (!guildConfig || !guildConfig.log_channel_id) return;

    const logChannel = await message.guild.channels.fetch(guildConfig.log_channel_id).catch(() => null);
    if (!logChannel) return;

    // Create deletion embed
    const logEmbed = embeds.info(
      "Message Deleted Log",
      null,
      client
    )
    .addFields(
      { name: "Author", value: `${message.author} (${message.author.tag})`, inline: true },
      { name: "Channel", value: `${message.channel}`, inline: true },
      { name: "Content", value: message.content ? `\`\`\`${message.content.substring(0, 1000)}\`\`\`` : "*No text content (likely an attachment or embed)*" }
    );

    logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  }
};
