const fs = require('fs');
const path = require('path');

let db;
let isSqlite = false;
let jsonDb = { guilds: {}, giveaways: {}, tickets: {} };
const jsonDbPath = path.join(__dirname, 'db.json');

try {
  const Database = require('better-sqlite3');
  const dbDir = __dirname;
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new Database(path.join(dbDir, 'database.db'));
  isSqlite = true;
  console.log('[Database] Connected to SQLite database successfully.');
} catch (error) {
  console.warn('[Database] better-sqlite3 failed to load or compile. Falling back to JSON database.');
  isSqlite = false;
  
  // Initialize JSON database
  if (fs.existsSync(jsonDbPath)) {
    try {
      jsonDb = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));
    } catch (e) {
      console.error('[Database] Failed to read JSON database, resetting.', e);
    }
  } else {
    fs.writeFileSync(jsonDbPath, JSON.stringify(jsonDb, null, 2), 'utf8');
  }
}

// Initialize tables if using SQLite
if (isSqlite) {
  // Guild configurations
  db.prepare(`
    CREATE TABLE IF NOT EXISTS guild_configs (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT,
      log_channel_id TEXT,
      upi_id TEXT
    )
  `).run();

  // Giveaways
  db.prepare(`
    CREATE TABLE IF NOT EXISTS giveaways (
      message_id TEXT PRIMARY KEY,
      channel_id TEXT,
      guild_id TEXT,
      prize TEXT,
      winner_count INTEGER,
      end_at INTEGER,
      ended INTEGER DEFAULT 0,
      participants TEXT
    )
  `).run();

  // Tickets
  db.prepare(`
    CREATE TABLE IF NOT EXISTS tickets (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT,
      user_id TEXT,
      status TEXT,
      claimed_by TEXT
    )
  `).run();
}

function saveJsonDb() {
  if (!isSqlite) {
    fs.writeFileSync(jsonDbPath, JSON.stringify(jsonDb, null, 2), 'utf8');
  }
}

module.exports = {
  isSqlite,

  // --- GUILD CONFIGS ---
  getGuildConfig(guildId) {
    if (isSqlite) {
      const row = db.prepare('SELECT * FROM guild_configs WHERE guild_id = ?').get(guildId);
      return row || null;
    } else {
      return jsonDb.guilds[guildId] || null;
    }
  },

  updateGuildConfig(guildId, updates) {
    if (isSqlite) {
      // First check if exists
      const exists = db.prepare('SELECT 1 FROM guild_configs WHERE guild_id = ?').get(guildId);
      if (exists) {
        const keys = Object.keys(updates);
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => updates[k]);
        db.prepare(`UPDATE guild_configs SET ${setClause} WHERE guild_id = ?`).run(...values, guildId);
      } else {
        const base = { guild_id: guildId, prefix: 'r!', log_channel_id: null, upi_id: 'rexcloud@upi' };
        const merged = { ...base, ...updates };
        db.prepare('INSERT INTO guild_configs (guild_id, prefix, log_channel_id, upi_id) VALUES (?, ?, ?, ?)').run(
          merged.guild_id, merged.prefix, merged.log_channel_id, merged.upi_id
        );
      }
    } else {
      if (!jsonDb.guilds[guildId]) {
        jsonDb.guilds[guildId] = { guild_id: guildId, prefix: 'r!', log_channel_id: null, upi_id: 'rexcloud@upi' };
      }
      jsonDb.guilds[guildId] = { ...jsonDb.guilds[guildId], ...updates };
      saveJsonDb();
    }
    return this.getGuildConfig(guildId);
  },

  // --- GIVEAWAYS ---
  saveGiveaway(giveaway) {
    // giveaway: { message_id, channel_id, guild_id, prize, winner_count, end_at, ended, participants: [] }
    if (isSqlite) {
      db.prepare(`
        INSERT OR REPLACE INTO giveaways (message_id, channel_id, guild_id, prize, winner_count, end_at, ended, participants)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        giveaway.message_id,
        giveaway.channel_id,
        giveaway.guild_id,
        giveaway.prize,
        giveaway.winner_count,
        giveaway.end_at,
        giveaway.ended ? 1 : 0,
        JSON.stringify(giveaway.participants || [])
      );
    } else {
      jsonDb.giveaways[giveaway.message_id] = {
        ...giveaway,
        participants: giveaway.participants || []
      };
      saveJsonDb();
    }
  },

  getGiveaway(messageId) {
    if (isSqlite) {
      const row = db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId);
      if (!row) return null;
      return {
        ...row,
        ended: row.ended === 1,
        participants: JSON.parse(row.participants || '[]')
      };
    } else {
      return jsonDb.giveaways[messageId] || null;
    }
  },

  getAllActiveGiveaways() {
    if (isSqlite) {
      const rows = db.prepare('SELECT * FROM giveaways WHERE ended = 0').all();
      return rows.map(r => ({
        ...r,
        ended: false,
        participants: JSON.parse(r.participants || '[]')
      }));
    } else {
      return Object.values(jsonDb.giveaways).filter(g => !g.ended);
    }
  },

  // --- TICKETS ---
  saveTicket(ticket) {
    // ticket: { channel_id, guild_id, user_id, status, claimed_by }
    if (isSqlite) {
      db.prepare(`
        INSERT OR REPLACE INTO tickets (channel_id, guild_id, user_id, status, claimed_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        ticket.channel_id,
        ticket.guild_id,
        ticket.user_id,
        ticket.status,
        ticket.claimed_by || null
      );
    } else {
      jsonDb.tickets[ticket.channel_id] = { ...ticket };
      saveJsonDb();
    }
  },

  getTicket(channelId) {
    if (isSqlite) {
      const row = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
      return row || null;
    } else {
      return jsonDb.tickets[channelId] || null;
    }
  }
};
