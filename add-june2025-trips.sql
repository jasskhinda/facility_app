-- Add some test trips with June 2025 dates for facility users
-- This will ensure the billing page shows data

-- First, let's get facility users
-- SELECT id FROM profiles WHERE facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';

-- Add test trips for June 2025 (assuming we have facility users)
INSERT INTO trips (
  user_id,
  pickup_address, 
  destination_address,
  pickup_time,
  status,
  price,
  wheelchair_type,
  is_round_trip,
  additional_passengers
) VALUES 
-- Trip 1
((SELECT id FROM profiles WHERE facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' LIMIT 1),
 '123 Main St, Columbus, OH',
 'Ohio State University Hospital, Columbus, OH', 
 '2025-06-05T10:30:00Z',
 'completed',
 45.50,
 'no_wheelchair',
 false,
 0),

-- Trip 2  
((SELECT id FROM profiles WHERE facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' LIMIT 1),
 '456 Oak Ave, Columbus, OH',
 'Mount Carmel East Hospital, Columbus, OH',
 '2025-06-10T14:15:00Z', 
 'completed',
 32.75,
 'wheelchair',
 false,
 1),

-- Trip 3
((SELECT id FROM profiles WHERE facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' LIMIT 1),
 '789 Pine St, Columbus, OH',
 'Riverside Methodist Hospital, Columbus, OH',
 '2025-06-15T09:00:00Z',
 'pending', 
 28.25,
 'no_wheelchair',
 true,
 0),

-- Trip 4
((SELECT id FROM profiles WHERE facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' LIMIT 1),
 '321 Elm St, Columbus, OH', 
 'Nationwide Children\'s Hospital, Columbus, OH',
 '2025-06-18T16:45:00Z',
 'upcoming',
 41.00,
 'wheelchair',
 false,
 2),

-- Trip 5
((SELECT id FROM profiles WHERE facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' LIMIT 1),
 '654 Maple Dr, Columbus, OH',
 'Grant Medical Center, Columbus, OH', 
 '2025-06-22T11:20:00Z',
 'completed',
 36.80,
 'no_wheelchair',
 false,
 0);

-- Verify the trips were added
SELECT 
  id,
  pickup_address,
  destination_address, 
  pickup_time,
  status,
  price
FROM trips 
WHERE pickup_time >= '2025-06-01T00:00:00Z' 
  AND pickup_time <= '2025-06-30T23:59:59Z'
ORDER BY pickup_time;
