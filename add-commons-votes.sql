-- Add columns for House of Commons vote data
ALTER TABLE bill
ADD COLUMN commons_ayes INTEGER DEFAULT 0,
ADD COLUMN commons_noes INTEGER DEFAULT 0,
ADD COLUMN commons_division_id INTEGER,
ADD COLUMN commons_division_title TEXT,
ADD COLUMN commons_vote_date TIMESTAMP;
