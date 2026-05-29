const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'convert',
  description: 'Convert currency in real-time using live exchange rates.',
  cooldown: 5,
  aliases: ['currency', 'forex'],
  data: new SlashCommandBuilder()
    .setName('convert')
    .setDescription('Convert currency in real-time using live exchange rates.')
    .addNumberOption(opt => 
      opt.setName('amount')
        .setDescription('The amount of money to convert')
        .setRequired(true))
    .addStringOption(opt => 
      opt.setName('from')
        .setDescription('The currency code to convert from (e.g. USD, EUR, INR)')
        .setRequired(true))
    .addStringOption(opt => 
      opt.setName('to')
        .setDescription('The currency code to convert to (e.g. INR, USD, EUR)')
        .setRequired(true)),

  async execute(message, args, client) {
    if (args.length < 3) {
      const syntaxEmbed = embeds.error(
        "Invalid Syntax",
        `Correct Usage: \`r!convert <amount> <from> <to>\`\nExample: \`r!convert 100 USD INR\``,
        client
      );
      return message.reply({ embeds: [syntaxEmbed] });
    }

    const amount = parseFloat(args[0]);
    const from = args[1].toUpperCase();
    const to = args[2].toUpperCase();

    if (isNaN(amount) || amount <= 0) {
      return message.reply({ 
        embeds: [embeds.error("Invalid Amount", "Please specify a valid numeric amount greater than zero.", client)] 
      });
    }

    const loadingEmbed = embeds.info("Converting", "Fetching latest exchange rates...", client);
    const statusMsg = await message.reply({ embeds: [loadingEmbed] });

    try {
      const result = await this.performConversion(amount, from, to);
      const resEmbed = embeds.success(
        "Currency Conversion",
        null,
        client
      )
      .addFields(
        { name: "Input", value: `\`${amount.toLocaleString()} ${from}\``, inline: true },
        { name: "Output", value: `\`${result.convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to}\``, inline: true },
        { name: "Exchange Rate", value: `\`1 ${from} = ${result.rate.toFixed(4)} ${to}\``, inline: false }
      );

      await statusMsg.edit({ embeds: [resEmbed] });
    } catch (error) {
      const errorMsg = typeof error === 'string' ? error : "Failed to fetch exchange rates. Make sure your currency codes are valid.";
      await statusMsg.edit({ embeds: [embeds.error("Conversion Error", errorMsg, client)] });
    }
  },

  async slashExecute(interaction, client) {
    const amount = interaction.options.getNumber('amount');
    const from = interaction.options.getString('from').toUpperCase();
    const to = interaction.options.getString('to').toUpperCase();

    await interaction.deferReply();

    try {
      const result = await this.performConversion(amount, from, to);
      const resEmbed = embeds.success(
        "Currency Conversion",
        null,
        client
      )
      .addFields(
        { name: "Input", value: `\`${amount.toLocaleString()} ${from}\``, inline: true },
        { name: "Output", value: `\`${result.convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to}\``, inline: true },
        { name: "Exchange Rate", value: `\`1 ${from} = ${result.rate.toFixed(4)} ${to}\``, inline: false }
      );

      await interaction.editReply({ embeds: [resEmbed] });
    } catch (error) {
      const errorMsg = typeof error === 'string' ? error : "Failed to fetch exchange rates. Make sure your currency codes are valid.";
      await interaction.editReply({ embeds: [embeds.error("Conversion Error", errorMsg, client)] });
    }
  },

  async performConversion(amount, from, to) {
    try {
      // Fetch latest USD base rates (allows cross-conversions easily)
      const response = await axios.get('https://open.er-api.com/v6/latest/USD');
      const rates = response.data.rates;

      if (!rates[from]) {
        throw `Unsupported currency code: \`${from}\`. Use codes like USD, INR, EUR, GBP.`;
      }
      if (!rates[to]) {
        throw `Unsupported currency code: \`${to}\`. Use codes like USD, INR, EUR, GBP.`;
      }

      // Convert from source currency to USD, then USD to target currency
      const rate = rates[to] / rates[from];
      const convertedAmount = amount * rate;

      return {
        rate,
        convertedAmount
      };
    } catch (err) {
      if (typeof err === 'string') throw err;
      console.error('[Convert API] Error fetching exchange rates:', err.message);
      throw 'Unable to connect to live exchange rates service. Please try again later.';
    }
  }
};
