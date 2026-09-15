const express = require('express');
const { createContact } = require('../controllers/contactController');
const contactRateLimit = require('../middleware/contactRateLimit');

const router = express.Router();

router.post('/', contactRateLimit, createContact);

module.exports = router;