const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'serverinfo',
  description: 'Retrieve detailed statistics and metrics about the server.',
  cooldown: 5,
  aliases: ['server', 'guildinfo', 'guild'],
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Retrieve detailed statistics and metrics about the server.'),

  async execute(message, args, client) {
    const embed = await this.buildServerEmbed(message.guild, client);
    message.reply({ embeds: [embed] });
  },

  async slashExecute(interaction, client) {
    const embed = await this.buildServerEmbed(interaction.guild, client);
    interaction.reply({ embeds: [embed] });
  },

  async buildServerEmbed(guild, client) {
    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === 0).size;
    const voiceChannels = channels.filter(c => c.type === 2).size;
    const roles = guild.roles.cache.size;
    const emojis = guild.emojis.cache.size;

    const embed = embeds.base(`${guild.name} Database Audit`, null, client)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "👑 Guild Owner", value: `${owner} (${owner.user.tag})`, inline: true },
        { name: "📅 Creation Date", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "👥 Members Count", value: `\`${guild.memberCount.toLocaleString()}\``, inline: true },
        { name: "📂 Channels", value: `📁 Total: \`${channels.size}\`\n💬 Text: \`${textChannels}\`\n🔊 Voice: \`${voiceChannels}\``, inline: true },
        { name: "🛠️ Server Roles", value: `\`${roles}\` roles`, inline: true },
        { name: "⚡ Boost Tier", value: `Tier \`${guild.premiumTier}\` (${guild.premiumSubscriptionCount || 0} Boosts)`, inline: true }
      );

    if (guild.bannerURL()) {
      embed.setImage(guild.bannerURL({ size: 1024 }));
    }

    return embed;
  }
};
