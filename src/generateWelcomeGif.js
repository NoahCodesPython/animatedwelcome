const { createCanvas, loadImage, registerFont } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const path = require('path');
const sharp = require('sharp');
const fetchImageBuffer = require('./utils/fetchImageBuffer');

// Register the Space Mono font
registerFont(path.join(__dirname, '../../assets/fonts/SpaceMono-Regular.ttf'), { family: 'Space Mono' });

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }

  lines.push(line.trim());
  return lines;
}

async function generateWelcomeGif(user, guild, messageTemplate, backgroundURL) {
  // Validate inputs early to fail fast
  if (!user || typeof user.displayAvatarURL !== 'function') {
    throw new Error('Invalid user object. Ensure the user parameter is a valid Discord.js User or GuildMember instance.');
  }
  
  if (!guild || !guild.name) {
    throw new Error('Invalid guild object. Ensure the guild parameter is a valid Discord.js Guild instance.');
  }

  const width = 700;
  const height = 250;
  const encoder = new GIFEncoder(width, height);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  encoder.start();
  encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
  encoder.setDelay(100); // frame delay in ms
  encoder.setQuality(10); // image quality. 10 is default.

  try {
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });

    // Fetch background and avatar images in parallel for better performance
    const [backgroundBuffer, avatarBuffer] = await Promise.all([
      fetchImageBuffer(backgroundURL || 'https://media.tenor.com/nG8mRUjHvhoAAAAC/galaxy.gif'),
      fetchImageBuffer(avatarURL)
    ]);

    // Extract frames from background GIF
    const gifFrames = await sharp(backgroundBuffer, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    if (!gifFrames.info || gifFrames.info.pages <= 0) {
      throw new Error('Invalid GIF format or no frames found.');
    }

    // Load user avatar
    const avatarImage = await loadImage(avatarBuffer);

    // Prepare welcome message
    const welcomeMsg = messageTemplate
      .replace('{user}', user.username)
      .replace('{server}', guild.name);

    // Calculate frame dimensions
    const frameHeight = gifFrames.info.pageHeight || gifFrames.info.height / gifFrames.info.pages;
    const frameSize = gifFrames.info.width * frameHeight * gifFrames.info.channels;
    const totalFrames = gifFrames.info.pages || Math.floor(gifFrames.data.length / frameSize);
    const maxFrames = Math.min(60, totalFrames);

    for (let i = 0; i < maxFrames; i++) {
      const frameStart = i * frameSize;
      const frameEnd = frameStart + frameSize;

      if (frameEnd > gifFrames.data.length) {
        continue; // Skip frames that exceed data length
      }

      const frameBuffer = gifFrames.data.slice(frameStart, frameEnd);

      if (frameBuffer.length !== frameSize) {
        continue; // Skip frames with incorrect size
      }

      const processedFrameBuffer = await sharp(frameBuffer, {
        raw: {
          width: gifFrames.info.width,
          height: frameHeight,
          channels: gifFrames.info.channels,
        },
      })
        .resize(width, height)
        .png()
        .toBuffer();

      const frameImage = await loadImage(processedFrameBuffer);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(frameImage, 0, 0, width, height);

      // Draw circular avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(100, height / 2, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImage, 50, height / 2 - 50, 100, 100);
      ctx.restore();

      // Draw username
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px Space Mono';
      ctx.fillText(user.username, 200, 100);

      // Draw welcome message
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Space Mono';
      ctx.fillText(welcomeMsg, 200, 150);

      encoder.addFrame(ctx);
    }

    // Finalize the GIFEncoder
    encoder.finish();

    // Return the complete GIF buffer
    return encoder.out.getData();
  } catch (error) {
    console.error('Error generating welcome GIF:', error);
    throw new Error('Failed to generate welcome GIF. Please check the image formats.');
  }
}

// Export the generateWelcomeGif function as the main entry point
module.exports = { generateWelcomeGif };
