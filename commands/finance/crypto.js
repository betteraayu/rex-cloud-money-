const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const embeds = require('../../utils/embeds');

const COIN_MAP = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  usdt: 'tether',
  bnb: 'binancecoin',
  xrp: 'ripple',
  doge: 'dogecoin',
  ada: 'cardano',
  trx: 'tron',
  matic: 'polygon',
  ltc: 'litecoin',
  dot: 'polkadot',
  avax: 'avalanche-2',
  link: 'chainlink'
};

module.exports = {
  name: 'crypto',
  description: 'Track real-time cryptocurrency prices and statistics.',
  cooldown: 5,
  aliases: ['coin', 'price'],
  data: new SlashCommandBuilder()
    .setName('crypto')
    .setDescription('Track real-time cryptocurrency prices and statistics.')
    .addStringOption(opt => 
      opt.setName('coin')
        .setDescription('The coin name or symbol (e.g. bitcoin, btc, ethereum, eth)')
        .setRequired(true)),

  async execute(message, args, client) {
    if (args.length === 0) {
      return message.reply({
        embeds: [embeds.error("Invalid Syntax", "Correct Usage: \`r!crypto <coin>\`\nExample: \`r!crypto bitcoin\` or \`r!crypto btc\`", client)]
      });
    }

    const input = args[0].toLowerCase();
    const coinId = COIN_MAP[input] || input;

    const loadingEmbed = embeds.info("Tracking", `Fetching statistics for **${args[0].toUpperCase()}**...`, client);
    const statusMsg = await message.reply({ embeds: [loadingEmbed] });

    try {
      const data = await this.fetchCryptoData(coinId);
      const resEmbed = this.buildCryptoEmbed(data, client);
      await statusMsg.edit({ embeds: [resEmbed] });
    } catch (error) {
      await statusMsg.edit({ 
        embeds: [embeds.error("Crypto System Error", typeof error === 'string' ? error : "Failed to retrieve coin details.", client)] 
      });
    }
  },

  async slashExecute(interaction, client) {
    const input = interaction.options.getString('coin').toLowerCase();
    const coinId = COIN_MAP[input] || input;

    await interaction.deferReply();

    try {
      const data = await this.fetchCryptoData(coinId);
      const resEmbed = this.buildCryptoEmbed(data, client);
      await interaction.editReply({ embeds: [resEmbed] });
    } catch (error) {
      await interaction.editReply({ 
        embeds: [embeds.error("Crypto System Error", typeof error === 'string' ? error : "Failed to retrieve coin details.", client)] 
      });
    }
  },

  async fetchCryptoData(coinId) {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}`;
      const response = await axios.get(url, {
        headers: { 'Accept-Encoding': 'gzip,deflate,compress' } // optimize network performance
      });

      if (!response.data || response.data.length === 0) {
        throw `Cryptocurrency \`${coinId}\` was not found on CoinGecko. Try writing the full name (e.g. \`bitcoin\`, \`solana\`).`;
      }

      return response.data[0];
    } catch (err) {
      if (typeof err === 'string') throw err;
      console.error('[Crypto API] Error:', err.message);
      throw 'Failed to connect to CoinGecko. The coin may be invalid, or API rate limit reached.';
    }
  },

  buildCryptoEmbed(coin, client) {
    const change24h = coin.price_change_percentage_24h || 0;
    const changeColor = change24h >= 0 ? "+" : "";
    const indicator = change24h >= 0 ? "📈" : "📉";
    
    const embed = embeds.info(
      `${coin.name} (${coin.symbol.toUpperCase()}) Statistics`,
      null,
      client
    )
    .setThumbnail(coin.image)
    .addFields(
      { name: "💵 Current Price", value: `\`$${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}\``, inline: true },
      { name: `${indicator} 24h Change`, value: `\`${changeColor}${change24h.toFixed(2)}%\``, inline: true },
      { name: "🪙 Market Cap", value: `\`$${coin.market_cap.toLocaleString()}\``, inline: false },
      { name: "📊 24h Trading Volume", value: `\`$${coin.total_volume.toLocaleString()}\``, inline: false }
    );

    // If change is positive, glowing teal, else neon red
    if (change24h >= 0) {
      embed.setColor(0x00f5d4); // success green/teal
    } else {
      embed.setColor(0xff0054); // error red
    }

    return embed;
  }
};
