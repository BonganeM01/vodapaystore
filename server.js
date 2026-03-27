import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
 
const app = express();
const PORT = process.env.PORT || 3000;
 
// Serve static files (your built Vue app)
app.use(express.static(join(__dirname, 'dist')));
 
// API routes - Render will serve files from /api folder
app.use('/api', (req, res, next) => {
  const apiPath = join(__dirname, 'api', req.path);
  // Try to find the handler
  if (fs.existsSync(apiPath + '.js')) {
    import(`./api${req.path}.js`)
      .then(module => {
        if (typeof module.default === 'function') {
          return module.default(req, res);
        }
        res.status(500).send('Invalid API handler');
      })
      .catch(err => {
        console.error('API error:', err);
        res.status(500).send('API error');
      });
  } else {
    next();
  }
});
 
// Fallback - serve index.html for Vue Router
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});
 
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});