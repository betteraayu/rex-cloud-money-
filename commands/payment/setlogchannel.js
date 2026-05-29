const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'setlogchannel',
  description: 'Set the official logging channel for payment logs and system audits.',
  cooldown: 5,
  aliases: ['setlog', 'logchannel'],
  userPermissions: [PermissionFlagsBits.Administrator],
  data: new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('Set the official logging channel for payment logs and system audits.')
    .addChannelOption(opt => 
      opt.setName('channel')
        .setDescription('The text channel to send logs to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(message, args, client) {
    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    
    if (!channel || channel.type !== ChannelType.GuildText) {
      return message.reply({
        embeds: [embeds.error("Invalid Channel", "Please mention a valid text channel or provide its ID.", client)]
      });
    }

    db.updateGuildConfig(message.guild.id, { log_channel_id: channel.id });

    const successEmbed = embeds.success(
      "Logging Configured",
      `System audit logs and payments will now be posted to: ${channel}`,
      client
    );

    message.reply({ embeds: [successEmbed] });
  },

  async slashExecute(interaction, client) {
    const channel = interaction.options.getChannel('channel');

    db.updateGuildConfig(interaction.guild.id, { log_channel_id: channel.id });

    const successEmbed = embeds.success(
      "Logging Configured",
      `System audit logs and payments will now be posted to: ${channel}`,
      client
    );

    interaction.reply({ embeds: [successEmbed] });
  }
};
