import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.post('/api/notify', express.raw({ type: '*/*' }), async (req, res) => {
  const module = await import('./api/notify.js');
  req.body = req.body;
  return module.default(req, res);
});

app.post('/api/vodapay/sign', express.json(), async (req, res) => {
  const module = await import('./api/vodapay/sign.js');
  return module.default(req, res);
});

app.use(express.static(join(__dirname, 'dist')));

//Vue Router fallback
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});