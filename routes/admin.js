const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const dashboardController = require('../controllers/admin/dashboardController');
const ordersController = require('../controllers/admin/ordersController');
const chefsController = require('../controllers/admin/chefsController');
const logisticsController = require('../controllers/admin/logisticsController');
const customersController = require('../controllers/admin/customersController');
const leadsController = require('../controllers/admin/leadsController');
const financeController = require('../controllers/admin/financeController');
const consultationsController = require('../controllers/admin/consultationsController');
const pendingSignupsController = require('../controllers/admin/pendingSignupsController');
const dishesController = require('../controllers/admin/dishesController');
const userOrdersController = require('../controllers/admin/userOrdersController');
const { uploadDishImage } = require('../config/upload');

const router = express.Router();
router.use(authenticate);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard/kpis', dashboardController.getKpis);
router.get('/dashboard/revenue-chart', dashboardController.getRevenueChart);

// Orders (admin_orders - legacy)
router.get('/orders', ordersController.list);
router.get('/orders/:id', ordersController.getOne);
router.post('/orders', ordersController.create);
router.patch('/orders/:id', ordersController.update);

// Open orders (user_orders from user dashboard - view & confirm & assign chef)
router.get('/open-orders', userOrdersController.list);
router.get('/open-orders/:id', userOrdersController.getOne);
router.patch('/open-orders/:id/confirm', userOrdersController.confirm);
router.patch('/open-orders/:id/assign', userOrdersController.assignChef);
router.get('/chefs-for-assign', userOrdersController.listChefsForAssign);

// Chefs
router.get('/chefs', chefsController.list);
router.get('/chefs/:id', chefsController.getOne);
router.post('/chefs', chefsController.create);
router.patch('/chefs/:id', chefsController.update);

// Logistics
router.get('/logistics', logisticsController.list);
router.get('/logistics/:id', logisticsController.getOne);
router.post('/logistics', logisticsController.create);
router.patch('/logistics/:id', logisticsController.update);

// Customers
router.get('/customers', customersController.list);
router.get('/customers/:id', customersController.getOne);
router.post('/customers', customersController.create);
router.patch('/customers/:id', customersController.update);

// Leads
router.get('/leads', leadsController.list);
router.get('/leads/:id', leadsController.getOne);
router.post('/leads', leadsController.create);
router.patch('/leads/:id', leadsController.update);

// Finance
router.get('/finance/analytics', financeController.getAnalytics);
router.get('/finance/payments', financeController.listPayments);
router.post('/finance/payments', financeController.createPayment);

// Consultations (form submissions)
router.get('/consultations', consultationsController.list);
router.get('/consultations/:id', consultationsController.getOne);

// Pending signups (site user registrations awaiting approval)
router.get('/pending-signups', pendingSignupsController.list);
router.get('/pending-signups/:id', pendingSignupsController.getOne);
router.post('/pending-signups/:id/approve', pendingSignupsController.approve);
router.post('/pending-signups/:id/reject', pendingSignupsController.reject);

// Dishes (Dish Management)
router.get('/dishes/stats', dishesController.getStats);
router.get('/dishes', dishesController.list);
router.get('/dishes/:id', dishesController.getOne);
router.post('/dishes', function (req, res, next) {
  uploadDishImage(req, res, function (err) {
    if (err) return res.status(400).json({ error: err.message || 'Image upload failed' });
    next();
  });
}, dishesController.create);
router.put('/dishes/:id', function (req, res, next) {
  uploadDishImage(req, res, function (err) {
    if (err) return res.status(400).json({ error: err.message || 'Image upload failed' });
    next();
  });
}, dishesController.update);
router.delete('/dishes/:id', dishesController.remove);
router.patch('/dishes/:id/feature', dishesController.toggleFeatured);
router.patch('/dishes/:id/availability', dishesController.toggleAvailable);

module.exports = router;
