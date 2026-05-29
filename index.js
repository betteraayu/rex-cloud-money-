require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Initialize Client with comprehensive gateway intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

console.log('[System] Initializing Rex Cloud Manager Bot...');

// Load Handlers
require('./handlers/antiCrash')(client);
require('./handlers/commandHandler')(client);
require('./handlers/eventHandler')(client);

// Login to Discord
const token = process.env.DISCORD_TOKEN;
if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
  console.error('[Error] DISCORD_TOKEN is missing or not configured inside .env. Please update your environment variables.');
  process.exit(1);
}

client.login(token).catch(err => {
  console.error('[Fatal Error] Failed to log in to Discord:', err);
  process.exit(1);
});
