// // src/main/utils/url.js
// function normalizeUrl(value) {
//   let input = String(value ?? '').trim();
//   if (!input) throw new Error('URL is required.');

//   // If user typed "godaddy.com" or "example.org", default to https://
//   if (!/^https?:\/\//i.test(input)) {
//     input = `https://${input}`;
//   } else if (/^http:\/\//i.test(input)) {
//     // Automatically upgrade http to https
//     input = input.replace(/^http:\/\//i, 'https://');
//   }

//   let parsed;
//   try {
//     parsed = new URL(input);
//   } catch {
//     throw new Error('Invalid URL.');
//   }

//   return parsed.href;
// }

// module.exports = { normalizeUrl };









// src/main/utils/url.js

const BLOCKED_SCHEMES = new Set(['javascript:', 'file:', 'data:', 'vbscript:', 'shell:', 'chrome:']);

function normalizeUrl(value) {
  let input = String(value ?? '').trim();
  if (!input) throw new Error('URL is required.');

  // Block inline script execution attempts
  if (/^(javascript|vbscript|data):/i.test(input)) {
    throw new Error('Blocked execution of unsafe protocol scheme.');
  }

  // Handle plain domain inputs
  if (!/^https?:\/\//i.test(input)) {
    input = `https://${input}`;
  }

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Invalid URL format.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Unauthorized protocol scheme: ${parsed.protocol}`);
  }

  return parsed.href;
}

function isSafeWebUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

module.exports = { normalizeUrl, isSafeWebUrl };