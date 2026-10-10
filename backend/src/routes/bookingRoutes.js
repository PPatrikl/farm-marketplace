const express = require('express');
const {
  createBooking,
  getBookingAvailability,
  listBookings,
  archiveBooking,
  markBookingRead,
  decideBooking,
} = require('../controllers/bookingController');

const router = express.Router();

router.get('/', listBookings);
router.get('/availability', getBookingAvailability);
router.post('/notifications/read', markBookingRead);
router.post('/:booking_id/archive', archiveBooking);
router.patch('/:booking_id', decideBooking);
router.post('/', createBooking);

module.exports = router;
