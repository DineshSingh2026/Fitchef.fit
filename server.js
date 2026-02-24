require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { ensureDb } = require('./config/ensureDb');
const earlyAccessRoutes = require('./routes/earlyAccess');
const consultationRoutes = require('./routes/consultation');
const adminAuthRoutes = require('./routes/adminAuth');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/early-access', earlyAccessRoutes);
app.use('/api/consultation', consultationRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);

app.get('/admin', (req, res) => res.redirect('/admin/index.html'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

ensureDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`FitChef.fit server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('DB setup failed:', err.message);
    app.listen(PORT, () => {
      console.log(`FitChef.fit server running on port ${PORT} (DB may need DATABASE_URL)`);
    });
  });
