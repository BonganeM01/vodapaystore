import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- RAW BODY FOR /api/notify ---
app.post('/api/notify', express.raw({ type: '*/*' }), async (req, res) => {
  const module = await import('./api/notify.js');
  req.body = req.body; // raw Buffer for your signature validator
  return module.default(req, res);
});

// --- JSON BODY FOR SIGN ROUTE ---
app.post('/api/vodapay/sign', express.json(), async (req, res) => {
  const module = await import('./api/vodapay/sign.js');
  return module.default(req, res);
});

// // --- Serve your Vue app ---
// app.use(express.static(join(__dirname, 'dist')));

// // --- Vue Router fallback (ONLY for non-API routes) ---
// app.get(/^\/(?!api\/).*/, (req, res) => {
//   res.sendFile(join(__dirname, 'dist', 'index.html'));
// });


app.use(express.static(join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});