const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config/config');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'upi',
  description: 'Generate a payment request with a UPI QR code.',
  cooldown: 5,
  aliases: ['pay', 'payment'],
  data: new SlashCommandBuilder()
    .setName('upi')
    .setDescription('Generate a payment request with a UPI QR code.')
    .addNumberOption(opt => 
      opt.setName('amount')
        .setDescription('Optional payment amount to pre-fill')
        .setRequired(false)),

  async execute(message, args, client) {
    let amount = null;
    if (args.length > 0) {
      amount = parseFloat(args[0]);
      if (isNaN(amount) || amount <= 0) {
        return message.reply({
          embeds: [embeds.error("Invalid Amount", "If specifying an amount, it must be a positive number.", client)]
        });
      }
    }

    const embed = this.buildPaymentEmbed(message.guild.id, amount, client);
    message.reply({ embeds: [embed] });
  },

  async slashExecute(interaction, client) {
    const amount = interaction.options.getNumber('amount');
    
    if (amount !== null && amount <= 0) {
      return interaction.reply({
        embeds: [embeds.error("Invalid Amount", "The amount must be a positive number.", client)],
        ephemeral: true
      });
    }

    const embed = this.buildPaymentEmbed(interaction.guild.id, amount, client);
    interaction.reply({ embeds: [embed] });
  },

  buildPaymentEmbed(guildId, amount, client) {
    const guildConfig = db.getGuildConfig(guildId);
    const upiId = guildConfig?.upi_id || config.defaultUpiId;

    // Build UPI Uri format
    let upiUrl = `upi://pay?pa=${upiId}&pn=Rex%20Cloud&cu=INR`;
    if (amount) {
      upiUrl += `&am=${amount}`;
    }

    // Generate QR Code URL from open API
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}&color=9b5de5&bgcolor=0f0f12`;

    const embed = embeds.base("Rex Cloud UPI Billing", null, client)
      .setThumbnail(qrCodeUrl)
      .addFields(
        { name: "💳 UPI Address", value: `\`${upiId}\``, inline: true },
        { name: "💰 Requested Amount", value: amount ? `\`₹${amount.toLocaleString('en-IN')}\`` : "`Flexible Payment`", inline: true },
        { name: "⚡ Payment Instructions", value: "1. Scan the QR code using any UPI App (**GPay, PhonePe, Paytm, BHIM**).\n2. Verify the payment details match above.\n3. Complete transaction and capture a **screenshot**.\n4. Run `/done` to submit confirmation to staff!" }
      );

    return embed;
  }
};
