const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireLogistics } = require('../middleware/requireLogistics');
const authController = require('../controllers/logistics/authController');
const ordersController = require('../controllers/logistics/ordersController');
const agentsController = require('../controllers/logistics/agentsController');

const router = express.Router();

router.post('/auth/login', authController.login);

router.use(authenticate);
router.use(requireLogistics);

router.get('/overview', ordersController.overview);
router.get('/orders/open', ordersController.openOrders);
router.get('/orders/ready', ordersController.readyOrders);
router.get('/orders/out', ordersController.outOrders);
router.get('/orders/delivered', ordersController.deliveredOrders);
router.put('/orders/:id/assign-agent', ordersController.assignAgent);
router.put('/orders/:id/out-for-delivery', ordersController.outForDelivery);
router.put('/orders/:id/delivered', ordersController.markDelivered);
router.get('/agents', agentsController.list);

module.exports = router;
