const express = require('express');

const healthRoutes = require('./healthRoutes');
const bookingRoutes = require('./bookingRoutes');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'API is ready' });
});

router.use('/health', healthRoutes);
router.use('/bookings', bookingRoutes);

module.exports = router;
