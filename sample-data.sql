-- Sample realistic data for Apartment Management System
-- Run this after setting up the main schema

-- Insert sample apartment units
INSERT INTO units (unit_number, floor, bedrooms, bathrooms, size_sqft, rent_amount, status) VALUES
-- Studio apartments (Floor 1-2)
('101', 1, 1, 1, 450, 1200.00, 'vacant'),
('102', 1, 1, 1, 465, 1250.00, 'occupied'),
('103', 1, 1, 1, 450, 1200.00, 'vacant'),
('201', 2, 1, 1, 485, 1300.00, 'occupied'),
('202', 2, 1, 1, 470, 1275.00, 'vacant'),
('203', 2, 1, 1, 485, 1300.00, 'under_maintenance'),

-- One bedroom apartments (Floor 3-4)
('301', 3, 1, 1, 650, 1600.00, 'occupied'),
('302', 3, 1, 1, 680, 1650.00, 'occupied'),
('303', 3, 1, 1, 650, 1600.00, 'vacant'),
('401', 4, 1, 1, 720, 1750.00, 'occupied'),
('402', 4, 1, 1, 695, 1700.00, 'vacant'),
('403', 4, 1, 1, 720, 1750.00, 'vacant'),

-- Two bedroom apartments (Floor 5-6)
('501', 5, 2, 2, 950, 2200.00, 'occupied'),
('502', 5, 2, 2, 980, 2300.00, 'occupied'),
('503', 5, 2, 1, 920, 2150.00, 'vacant'),
('601', 6, 2, 2, 1020, 2400.00, 'occupied'),
('602', 6, 2, 2, 995, 2350.00, 'under_maintenance'),
('603', 6, 2, 2, 1020, 2400.00, 'vacant'),

-- Three bedroom apartments (Floor 7-8) - Premium units
('701', 7, 3, 2, 1250, 2900.00, 'occupied'),
('702', 7, 3, 2, 1280, 3000.00, 'vacant'),
('801', 8, 3, 2, 1350, 3200.00, 'occupied'),
('802', 8, 3, 3, 1400, 3400.00, 'vacant'),

-- Penthouse units (Floor 9) - Luxury
('901', 9, 4, 3, 1800, 4500.00, 'vacant'),
('902', 9, 4, 3, 1850, 4700.00, 'occupied');

-- Note: To add tenant users and leases, you'll need to:
-- 1. Register tenant accounts through the app interface
-- 2. Set their role to 'tenant' in the users table
-- 3. Create leases linking tenants to units
-- 4. Add payment records and maintenance requests

-- Sample announcements from admin
INSERT INTO announcements (title, content, author_id) VALUES
('Welcome to Sunset Towers!', 'We''re excited to have you as part of our community. Please familiarize yourself with the building policies and don''t hesitate to reach out if you have any questions.', NULL),
('Scheduled Maintenance - Elevator', 'The main elevator will be under maintenance on Saturday, March 15th from 9 AM to 3 PM. Please use the stairs or the service elevator during this time.', NULL),
('Pool Area Reopening', 'We''re happy to announce that the pool area renovation is complete! The pool will reopen on Monday, March 18th with new safety features and updated decor.', NULL),
('Rent Payment Reminder', 'Friendly reminder that rent payments are due on the 1st of each month. Late payments after the 5th will incur a $50 late fee. Thank you for your cooperation.', NULL);

-- Update some units to show realistic occupancy
UPDATE units SET status = 'occupied' WHERE unit_number IN ('102', '201', '301', '302', '401', '501', '502', '601', '701', '801', '902');
UPDATE units SET status = 'under_maintenance' WHERE unit_number IN ('203', '602');

-- You can run this to see the results:
-- SELECT unit_number, floor, bedrooms, bathrooms, size_sqft, rent_amount, status FROM units ORDER BY unit_number;
