const app = require('./app');
const { connectDatabase } = require('./db');

const port = process.env.PORT || 4000;
connectDatabase()
  .then(() => app.listen(port, () => console.log(`Pharmacy Stock API listening on http://localhost:${port}`)))
  .catch((error) => { console.error('Database connection failed:', error.message); process.exit(1); });
