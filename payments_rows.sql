-- Add status column to payments table if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Paid';

-- Update existing records with status (only if they don't have one)
UPDATE payments SET status = 'Paid' WHERE status IS NULL;
