const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'setupupi',
  description: 'Configure the default UPI ID for payments.',
  cooldown: 5,
  aliases: ['setupi'],
  userPermissions: [PermissionFlagsBits.Administrator],
  data: new SlashCommandBuilder()
    .setName('setupupi')
    .setDescription('Configure the default UPI ID for payments.')
    .addStringOption(opt => 
      opt.setName('upi-id')
        .setDescription('The new UPI ID (e.g. rexcloud@upi)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(message, args, client) {
    if (args.length === 0) {
      return message.reply({
        embeds: [embeds.error("Invalid Syntax", "Correct Usage: \`r!setupupi <upi-id>\`\nExample: \`r!setupupi rexcloud@upi\`", client)]
      });
    }

    const upiId = args[0].trim();
    
    // Simple UPI validation (typically contains @)
    if (!upiId.includes('@')) {
      return message.reply({
        embeds: [embeds.error("Invalid UPI ID", "Please specify a valid UPI ID structure containing `@`.", client)]
      });
    }

    db.updateGuildConfig(message.guild.id, { upi_id: upiId });

    const successEmbed = embeds.success(
      "UPI Configured",
      `The payment UPI ID has been set to: \`${upiId}\``,
      client
    );

    message.reply({ embeds: [successEmbed] });
  },

  async slashExecute(interaction, client) {
    const upiId = interaction.options.getString('upi-id').trim();

    if (!upiId.includes('@')) {
      return interaction.reply({
        embeds: [embeds.error("Invalid UPI ID", "Please specify a valid UPI ID structure containing `@`.", client)],
        ephemeral: true
      });
    }

    db.updateGuildConfig(interaction.guild.id, { upi_id: upiId });

    const successEmbed = embeds.success(
      "UPI Configured",
      `The payment UPI ID has been set to: \`${upiId}\``,
      client
    );

    interaction.reply({ embeds: [successEmbed] });
  }
};
