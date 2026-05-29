const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config/config');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'help',
  description: 'Display all available bot features and command syntaxes.',
  cooldown: 3,
  aliases: ['h', 'commands'],
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display all available bot features and command syntaxes.'),

  async execute(message, args, client) {
    const guildConfig = db.getGuildConfig(message.guild.id);
    const prefix = guildConfig?.prefix || config.prefix;

    const embed = this.buildHelpEmbed(prefix, client);
    message.reply({ embeds: [embed] });
  },

  async slashExecute(interaction, client) {
    const guildConfig = db.getGuildConfig(interaction.guild.id);
    const prefix = guildConfig?.prefix || config.prefix;

    const embed = this.buildHelpEmbed(prefix, client);
    interaction.reply({ embeds: [embed] });
  },

  buildHelpEmbed(prefix, client) {
    const embed = embeds.base("Rex Cloud Manager Directory", null, client)
      .setDescription(
        `Welcome to the official **Rex Cloud Manager** system interface.\nOur prefix on this server is \`${prefix}\`. Both Prefix and Slash commands are supported.\n\nUse \`${prefix}<command>\` or \`/<command>\` to interact.`
      )
      .addFields(
        { 
          name: "💱 Currency & Crypto Systems", 
          value: `\`convert\` ${config.emojis.arrow} Converts live currency exchange rates.\n*Usage:* \`${prefix}convert <amount> <from> <to>\`\n\`crypto\` ${config.emojis.arrow} Fetch 24h crypto indices and stats.\n*Usage:* \`${prefix}crypto <coin_abbrev>\`` 
        },
        { 
          name: "💳 UPI Payment System", 
          value: `\`upi\` ${config.emojis.arrow} Pre-fills dynamic UPI invoice QR embeds.\n*Usage:* \`${prefix}upi [amount]\`\n\`setupupi\` ${config.emojis.arrow} [Admin] Customize default UPI endpoint.\n*Usage:* \`${prefix}setupupi <upi-id>\` (e.g. \`rexcloud@upi\`)` 
        },
        { 
          name: "✅ Payment Confirmation System", 
          value: `\`/done\` ${config.emojis.arrow} [Admin] Modals & receipt upload log routine.\n\`setlogchannel\` ${config.emojis.arrow} [Admin] Save official audits text channel.\n*Usage:* \`${prefix}setlogchannel <#channel>\`` 
        },
        { 
          name: "🎉 Giveaway & 🎫 Ticket Systems", 
          value: `\`giveaway\` ${config.emojis.arrow} Start, end, or reroll giveaway draws.\n*Usage:* \`${prefix}giveaway <start|end|reroll> [options]\`\n\`ticket\` ${config.emojis.arrow} Setup multi-purpose customer support ticket panel.\n*Usage:* \`${prefix}ticket setup <#channel>\`` 
        },
        { 
          name: "⚙️ Core Utility Commands", 
          value: `\`ping\` ${config.emojis.arrow} Shows API network latency.\n\`serverinfo\` ${config.emojis.arrow} Audits current guild metrics.\n\`userinfo\` ${config.emojis.arrow} Inspects server profile analytics.` 
        }
      );
    return embed;
  }
};
