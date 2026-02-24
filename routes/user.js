const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireUser } = require('../middleware/requireUser');
const profileController = require('../controllers/user/profileController');
const ordersController = require('../controllers/user/ordersController');
const feedbackController = require('../controllers/user/feedbackController');
const supportController = require('../controllers/user/supportController');
const notificationsController = require('../controllers/user/notificationsController');

const router = express.Router();
router.use(authenticate);
router.use(requireUser);

router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);

router.get('/orders', ordersController.list);
router.get('/orders/delivered', ordersController.listDelivered);
router.post('/orders', ordersController.create);

router.get('/notifications', notificationsController.list);
router.patch('/notifications/:id/read', notificationsController.markRead);

router.post('/feedback', feedbackController.create);

router.post('/support', supportController.create);

module.exports = router;
