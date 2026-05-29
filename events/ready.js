const { ActivityType } = require('discord.js');
const config = require('../config/config');
const db = require('../database/db');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[Client] Logged in as ${client.user.tag} (${client.user.id}).`);
    
    // Set Bot Status
    client.user.setPresence({
      activities: [{ name: config.status, type: ActivityType.Watching }],
      status: 'online',
    });

    console.log(`[Client] Status set to: Watching ${config.status}`);

    // Deploy slash commands
    await client.deploySlashCommands();
    
    // Start Giveaway check loop (every 10 seconds)
    setInterval(async () => {
      const activeGiveaways = db.getAllActiveGiveaways();
      const now = Date.now();
      
      for (const giveaway of activeGiveaways) {
        if (now >= giveaway.end_at) {
          try {
            const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
            if (!channel) {
              // Channel deleted, just mark ended
              giveaway.ended = true;
              db.saveGiveaway(giveaway);
              continue;
            }

            const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
            if (!message) {
              // Message deleted, mark ended
              giveaway.ended = true;
              db.saveGiveaway(giveaway);
              continue;
            }

            // End the giveaway!
            const giveawayModule = require('../commands/giveaway/giveaway');
            await giveawayModule.endGiveaway(message, giveaway, client);
          } catch (err) {
            console.error('[Giveaway Ticker] Error ending giveaway:', err);
          }
        }
      }
    }, 10000);

    console.log('[System] Rex Cloud Manager is fully online and active.');
  }
};
