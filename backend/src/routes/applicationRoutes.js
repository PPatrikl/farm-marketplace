const express = require('express');
const {
  createApplication,
  listApplications,
  listNotifications,
  markNotificationRead,
  archiveApplication,
  decideApplication,
} = require('../controllers/applicationController');

const router = express.Router();

router.get('/', listApplications);
router.get('/notifications', listNotifications);
router.post('/notifications/read', markNotificationRead);
router.post('/:application_id/archive', archiveApplication);
router.patch('/:application_id', decideApplication);
router.post('/', createApplication);

module.exports = router;
