const { createCanvas, loadImage, registerFont } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const fetch = require('node-fetch');
const { Readable } = require('stream');
const path = require('path');
const sharp = require('sharp'); // Import sharp for image processing

// Register the Open Sans font
registerFont(path.join(__dirname, '../../assets/fonts/SpaceMono-Regular.ttf'), { family: 'Space Mono' });

async function fetchImageBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image from ${url}`);
  return await response.buffer();
}

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
  const width = 700;
  const height = 250;
  const encoder = new GIFEncoder(width, height);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  encoder.start();
  encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
  encoder.setDelay(100); // frame delay in ms
  encoder.setQuality(10); // image quality. 10 is default.

  console.log('generateWelcomeGif function started');

  try {
    // Validate user object
    if (!user || typeof user.displayAvatarURL !== 'function') {
      throw new Error('Invalid user object. Ensure the user parameter is a valid Discord.js User or GuildMember instance.');
    }

    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });
    console.log('Fetching background URL:', backgroundURL);
    console.log('Fetching avatar URL:', avatarURL);

    console.log('Fetching background image buffer');
    const backgroundBuffer = await fetchImageBuffer(backgroundURL || 'https://media.tenor.com/nG8mRUjHvhoAAAAC/galaxy.gif');

    console.log('Extracting frames from background GIF');
    const gifFrames = await sharp(backgroundBuffer, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    if (!gifFrames.info || gifFrames.info.pages <= 0) {
      throw new Error('Invalid GIF format or no frames found.');
    }

    console.log('Number of frames extracted:', gifFrames.info.pages);

    // Load user avatar
    const avatarBuffer = await fetchImageBuffer(avatarURL);
    
    // Validate avatar buffer
    if (!avatarBuffer || avatarBuffer.length === 0) {
      console.error('Avatar buffer is empty. URL:', avatarURL);
      throw new Error('Avatar image buffer is empty. Please check the user avatar URL.');
    }

    console.log('Avatar buffer size:', avatarBuffer.length);
    console.log('Avatar buffer (first 20 bytes):', avatarBuffer.slice(0, 20));

    const avatarImage = await loadImage(avatarBuffer);

    // Prepare welcome message
    const welcomeMsg = messageTemplate
      .replace('{user}', user.username)
      .replace('{server}', guild.name);

    // Log detailed frame data for debugging
    console.log('Total data size:', gifFrames.data.length);
    console.log('Frame width:', gifFrames.info.width);
    console.log('Frame height:', gifFrames.info.height);
    console.log('Channels:', gifFrames.info.channels);

    // Manually calculate frame height if pageHeight is available
    const frameHeight = gifFrames.info.pageHeight || gifFrames.info.height / gifFrames.info.pages;
    console.log('Calculated frame height:', frameHeight);

    // Adjust frame size calculation
    const frameSize = gifFrames.info.width * frameHeight * gifFrames.info.channels;
    console.log('Adjusted frame size:', frameSize);

    // Validate total frames
    const totalFrames = gifFrames.info.pages || Math.floor(gifFrames.data.length / frameSize);
    console.log('Total frames calculated:', totalFrames);

    for (let i = 0; i < Math.min(60, totalFrames); i++) {
      const frameStart = i * frameSize;
      const frameEnd = frameStart + frameSize;

      console.log(`Processing frame ${i + 1}: Start=${frameStart}, End=${frameEnd}`);

      if (frameEnd > gifFrames.data.length) {
        console.warn(`Frame ${i + 1} exceeds data length. Skipping this frame.`);
        continue;
      }

      const frameBuffer = gifFrames.data.slice(frameStart, frameEnd);

      // Validate frame buffer
      if (!frameBuffer || frameBuffer.length !== frameSize) {
        console.warn(`Frame ${i + 1} buffer size mismatch or empty. Expected: ${frameSize}, Actual: ${frameBuffer.length}`);
        continue;
      }

      console.log(`Frame ${i + 1} buffer size: ${frameBuffer.length}`);
      console.log(`Frame ${i + 1} buffer (first 20 bytes):`, frameBuffer.slice(0, 20));

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

      ctx.save();
      ctx.beginPath();
      ctx.arc(100, height / 2, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImage, 50, height / 2 - 50, 100, 100);
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px Space Mono';
      ctx.fillText(user.username, 200, 100);

      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Space Mono';
      ctx.fillText(welcomeMsg, 200, 150);

      console.log(`Adding frame ${i + 1} to GIFEncoder.`);
      encoder.addFrame(ctx);

      console.log(`Completed processing frame ${i + 1}/${Math.min(60, totalFrames)}`);
    }

    // Finalize the GIFEncoder
    console.log('Finalizing GIFEncoder.');
    encoder.finish();

    // Return the complete GIF buffer
    return encoder.out.getData();
  } catch (error) {
    console.error('Error generating welcome GIF:', error);
    throw new Error('Failed to generate welcome GIF. Please check the image formats.');
  }
}

module.exports = { generateWelcomeGif };
