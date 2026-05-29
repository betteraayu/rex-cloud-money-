const db = require('../database/db');
const embeds = require('../utils/embeds');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (oldMessage.partial || newMessage.partial) return;
    if (oldMessage.author?.bot || !oldMessage.guild) return;
    if (oldMessage.content === newMessage.content) return; // Ignore edits that don't change content (like embeds loading)

    // Get log channel
    const guildConfig = db.getGuildConfig(oldMessage.guild.id);
    if (!guildConfig || !guildConfig.log_channel_id) return;

    const logChannel = await oldMessage.guild.channels.fetch(guildConfig.log_channel_id).catch(() => null);
    if (!logChannel) return;

    // Create edit embed
    const logEmbed = embeds.info(
      "Message Edited Log",
      null,
      client
    )
    .addFields(
      { name: "Author", value: `${oldMessage.author} (${oldMessage.author.tag})`, inline: true },
      { name: "Channel", value: `${oldMessage.channel}`, inline: true },
      { name: "Before", value: `\`\`\`${oldMessage.content.substring(0, 1000)}\`\`\`` },
      { name: "After", value: `\`\`\`${newMessage.content.substring(0, 1000)}\`\`\`` }
    );

    logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  }
};
