const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || '';
const isSupabaseHost = connectionString.includes('supabase.co');

const pool = new Pool({
  connectionString,
  // Supabase requires SSL for direct Postgres connections.
  ssl: (process.env.NODE_ENV === 'production' || isSupabaseHost)
    ? { rejectUnauthorized: false }
    : false,
});

pool.query('SELECT NOW()', (error, result) => {
  if (error) {
    console.error('Database connection failed:', error.message);
  } else {
    console.log('Database connected:', result.rows[0].now);
  }
});

module.exports = pool;
