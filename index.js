const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Use CORS to allow requests from your React frontend
app.use(cors({
    origin: 'https://proximity-search-app.vercel.app', // Allow requests from our React frontend
    methods: 'GET,POST,PUT,DELETE', // Define allowed HTTP methods -- in this case, CRUD methods.
    credentials: true, // Allow credentials to be shared between frontend and backend
}));

// Middleware to parse JSON requests
app.use(express.json());

// PostgreSQL Pool setup
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: {
    rejectUnauthorized: false, // This allows connecting without verifying the server certificate
  },
});

// Database Connection check
pool.connect((err, client, release) => {
    if (err) {
      console.error('Error acquiring client', err.stack);
    } else {
      console.log('Connected to PostgreSQL database successfully!');
      release(); // Release the client back to the pool
    }
  });

app.get("/", (req, res) => {
    res.send("Welcome to the Proximity Search API!");
});

// Proximity query route
app.post('/api/proximity-query', async (req, res) => {
  const { latitude, longitude, radius } = req.body;

  if (!latitude || !longitude || !radius) {
    return res.status(400).json({ error: 'Latitude, longitude, and radius are required' });
  }

  try {

    // Convert the radius from kilometers to meters for the ST_DWithin function
    const radiusInMeters = radius * 1000;

    const query = `
      SELECT *
      FROM schools
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        ST_SetSRID(ST_MakePoint(schools.longitude, schools.latitude), 4326)::geography,
        $3
      );
    `;
  
    const values = [longitude, latitude, radiusInMeters];

    const result = await pool.query(query, values);
    
    res.status(200).json({
      message: 'Proximity query successful',
      data: result.rows,
    });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal server error' + err });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
