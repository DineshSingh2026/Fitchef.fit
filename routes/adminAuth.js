const express = require('express');
const authController = require('../controllers/admin/authController');

const router = express.Router();
router.post('/login', authController.login);

module.exports = router;
