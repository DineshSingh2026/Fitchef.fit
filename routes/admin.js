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

const router = express.Router();
router.use(authenticate);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard/kpis', dashboardController.getKpis);
router.get('/dashboard/revenue-chart', dashboardController.getRevenueChart);

// Orders
router.get('/orders', ordersController.list);
router.get('/orders/:id', ordersController.getOne);
router.post('/orders', ordersController.create);
router.patch('/orders/:id', ordersController.update);

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

module.exports = router;
