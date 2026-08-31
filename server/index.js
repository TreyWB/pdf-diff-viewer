const express = require('express');
const path = require('path');
const diffRoutes = require('./routes/diff');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api', diffRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size too large. Maximum size is 25MB.' });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field.' });
  }

  const status = err.statusCode || 500;
  return res.status(status).json({ error: err.message || 'Internal server error' });
});

if (require.main === module) {
  const portArg = process.argv.find((arg) => arg.startsWith('--port='));
  const cliPort = portArg ? Number.parseInt(portArg.split('=')[1], 10) : undefined;
  const PORT = cliPort || process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`PDF Diff Viewer running at http://localhost:${PORT}`);
  });
}

module.exports = app;
