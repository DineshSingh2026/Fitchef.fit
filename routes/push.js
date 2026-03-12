const express = require('express');
const { authenticate } = require('../middleware/auth');
const pushController = require('../controllers/pushController');

const router = express.Router();

router.get('/vapid-public', pushController.getVapidPublic);
router.post('/subscribe', authenticate, pushController.subscribe);

module.exports = router;
