function getHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'farm-marketplace backend',
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getHealth,
};
