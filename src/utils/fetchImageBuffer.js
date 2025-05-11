const fetch = require('node-fetch');

async function fetchImageBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image from ${url}`);
  return await response.buffer();
}

module.exports = fetchImageBuffer;