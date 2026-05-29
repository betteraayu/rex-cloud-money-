const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder 
} = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'done',
  description: 'Submit payment details and receipt screenshot for logging (Staff/Admin Only).',
  cooldown: 10,
  userPermissions: [PermissionFlagsBits.Administrator],
  data: new SlashCommandBuilder()
    .setName('done')
    .setDescription('Submit payment details and receipt screenshot for logging (Staff/Admin Only).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Slash commands execution
  async slashExecute(interaction, client) {
    // 1. Create Modal
    const modal = new ModalBuilder()
      .setCustomId('paymentConfirmModal')
      .setTitle('Payment Confirmation Log');

    // 2. Create Text Inputs
    const customerInput = new TextInputBuilder()
      .setCustomId('customer')
      .setLabel('Customer (Name, Tag or Discord ID)')
      .setPlaceholder('e.g. @rexuser or 123456789012345678')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const planInput = new TextInputBuilder()
      .setCustomId('plan')
      .setLabel('Purchased Plan')
      .setPlaceholder('e.g. Ryzen VPS - 8GB RAM')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const amountInput = new TextInputBuilder()
      .setCustomId('amount')
      .setLabel('Payment Amount')
      .setPlaceholder('e.g. 500 INR or $10 USD')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const txidInput = new TextInputBuilder()
      .setCustomId('txid')
      .setLabel('Transaction ID')
      .setPlaceholder('e.g. UPI Ref 415392819283')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add inputs to rows
    const firstRow = new ActionRowBuilder().addComponents(customerInput);
    const secondRow = new ActionRowBuilder().addComponents(planInput);
    const thirdRow = new ActionRowBuilder().addComponents(amountInput);
    const fourthRow = new ActionRowBuilder().addComponents(txidInput);

    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

    // Show modal
    await interaction.showModal(modal);
  },

  // Modal Submit Callback
  async handleModalSubmit(interaction, client) {
    const customer = interaction.fields.getTextInputValue('customer');
    const plan = interaction.fields.getTextInputValue('plan');
    const amount = interaction.fields.getTextInputValue('amount');
    const txid = interaction.fields.getTextInputValue('txid');

    // Ephemerally alert staff to upload screenshot
    await interaction.reply({
      embeds: [
        embeds.info(
          "Details Registered",
          "✅ payment details recorded!\n\n📸 **Please upload the payment screenshot** (send it as an attachment in this channel) within **2 minutes** to finalize logging.",
          client
        )
      ],
      ephemeral: true
    });

    const filter = (m) => m.author.id === interaction.user.id && m.attachments.size > 0;
    const collector = interaction.channel.createMessageCollector({ 
      filter, 
      max: 1, 
      time: 120000 
    });

    collector.on('collect', async (collectedMessage) => {
      // Get the attachment
      const attachment = collectedMessage.attachments.first();
      const imageUrl = attachment.url;

      // Try deleting the uploaded message to keep chat clean
      await collectedMessage.delete().catch(() => {});

      const guildConfig = db.getGuildConfig(interaction.guild.id);
      if (!guildConfig || !guildConfig.log_channel_id) {
        return interaction.followUp({
          embeds: [embeds.error("Logging Channel Not Found", "The payment was validated, but no log channel has been configured. Configure it using `r!setlogchannel` first.", client)],
          ephemeral: true
        });
      }

      const logChannel = await interaction.guild.channels.fetch(guildConfig.log_channel_id).catch(() => null);
      if (!logChannel) {
        return interaction.followUp({
          embeds: [embeds.error("Logging Channel Offline", "The designated logging channel is missing or inaccessible.", client)],
          ephemeral: true
        });
      }

      // Build Logging Embed
      const logEmbed = embeds.success(
        "Payment Confirmed",
        null,
        client
      )
      .addFields(
        { name: "👤 Customer", value: `${customer}`, inline: true },
        { name: "🛡️ Staff Member", value: `${interaction.user}`, inline: true },
        { name: "💰 Paid Amount", value: `\`${amount}\``, inline: true },
        { name: "🖥️ Plan Purchased", value: `\`${plan}\``, inline: true },
        { name: "⛓️ Transaction ID", value: `\`${txid}\``, inline: true },
        { name: "📅 Log Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
      )
      .setImage(imageUrl);

      await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

      await interaction.followUp({
        embeds: [embeds.success("Success", `Payment confirmed and posted successfully to ${logChannel}!`, client)],
        ephemeral: true
      });
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        interaction.followUp({
          embeds: [embeds.error("Action Timed Out", "You failed to upload the screenshot within 2 minutes. Submission aborted.", client)],
          ephemeral: true
        }).catch(() => {});
      }
    });
  }
};
