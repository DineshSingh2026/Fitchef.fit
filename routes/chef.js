const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireChef } = require('../middleware/requireChef');
const authController = require('../controllers/chef/authController');
const profileController = require('../controllers/chef/profileController');
const ordersController = require('../controllers/chef/ordersController');

const router = express.Router();

router.post('/auth/login', authController.login);

router.use(authenticate);
router.use(requireChef);

router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);
router.get('/orders/open', ordersController.openOrders);
router.get('/orders/completed', ordersController.completedOrders);
router.patch('/orders/:id/ready', ordersController.markReady);

module.exports = router;
