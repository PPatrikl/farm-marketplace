require('dotenv').config();

const app = require('./app');
require('./config/db');

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
