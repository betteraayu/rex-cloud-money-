const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'ping',
  description: 'Retrieve the bot latency and WebSocket connection health.',
  cooldown: 3,
  aliases: ['latency', 'speed'],
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Retrieve the bot latency and WebSocket connection health.'),

  async execute(message, args, client) {
    const sent = await message.reply({ 
      embeds: [embeds.info("Latency Calculation", "⚡ Pinging WebSocket nodes...", client)] 
    });

    const roundTrip = sent.createdTimestamp - message.createdTimestamp;
    const wsPing = client.ws.ping;

    const resEmbed = embeds.success("System Connection Stable", null, client)
      .addFields(
        { name: "📡 Message Roundtrip", value: `\`${roundTrip}ms\``, inline: true },
        { name: "🌐 WebSocket Pulse", value: `\`${wsPing}ms\``, inline: true }
      );

    await sent.edit({ embeds: [resEmbed] });
  },

  async slashExecute(interaction, client) {
    const sent = await interaction.reply({ 
      embeds: [embeds.info("Latency Calculation", "⚡ Pinging WebSocket nodes...", client)], 
      fetchReply: true 
    });

    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = client.ws.ping;

    const resEmbed = embeds.success("System Connection Stable", null, client)
      .addFields(
        { name: "📡 Message Roundtrip", value: `\`${roundTrip}ms\``, inline: true },
        { name: "🌐 WebSocket Pulse", value: `\`${wsPing}ms\``, inline: true }
      );

    await interaction.editReply({ embeds: [resEmbed] });
  }
};
