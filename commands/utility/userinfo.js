const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'userinfo',
  description: 'Retrieve registration and profile analytics of a server member.',
  cooldown: 5,
  aliases: ['user', 'whois', 'profile'],
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Retrieve registration and profile analytics of a server member.')
    .addUserOption(opt => 
      opt.setName('user')
        .setDescription('The member to inspect (defaults to yourself)')
        .setRequired(false)),

  async execute(message, args, client) {
    let member = message.mentions.members.first();
    if (!member && args[0]) {
      member = await message.guild.members.fetch(args[0]).catch(() => null);
    }
    if (!member) {
      member = message.member;
    }

    const embed = this.buildUserEmbed(member, client);
    message.reply({ embeds: [embed] });
  },

  async slashExecute(interaction, client) {
    const userOption = interaction.options.getMember('user');
    const member = userOption || interaction.member;

    const embed = this.buildUserEmbed(member, client);
    interaction.reply({ embeds: [embed] });
  },

  buildUserEmbed(member, client) {
    const user = member.user;
    const roles = member.roles.cache
      .filter(r => r.id !== member.guild.id)
      .map(r => r.toString())
      .join(', ') || "`No custom roles`";

    const embed = embeds.base(`${user.username} Account Profile`, null, client)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "👤 User Handle", value: `${user} (${user.tag})`, inline: true },
        { name: "⛓️ Discord ID", value: `\`${user.id}\``, inline: true },
        { name: "📅 Registered Date", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false },
        { name: "📥 Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: false },
        { name: "🏷️ Server Roles", value: roles }
      );

    return embed;
  }
};
