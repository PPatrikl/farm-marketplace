const express = require('express');

const healthRoutes = require('./healthRoutes');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'API is ready' });
});

router.use('/health', healthRoutes);

module.exports = router;
