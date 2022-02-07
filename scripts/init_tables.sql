/* users */
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT,
  password TEXT
);

/* species */
CREATE TABLE species (
  id SERIAL PRIMARY KEY,
  name TEXT,
  scientific_name TEXT
);

/* notes */
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  behavior TEXT,
  flock_size TEXT,
  date_time TIMESTAMPTZ, 
  user_id INTEGER
);

/* notes_species */
CREATE TABLE notes_species (
  id SERIAL PRIMARY KEY,
  notes_id INTEGER,
  species_id INTEGER
);

/* comments */
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT Now()
);