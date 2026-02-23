const express = require('express');
const router = express.Router();
const earlyAccessController = require('../controllers/earlyAccessController');

router.post('/', earlyAccessController.postEarlyAccess);

module.exports = router;
