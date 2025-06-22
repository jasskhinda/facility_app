-- Add test trips for June 22, 2025 (current date)
-- This ensures the billing page shows data for the current date

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
-- Trip 1 - Today's date
((SELECT id FROM profiles WHERE facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' LIMIT 1),
 '123 Main St, Columbus, OH',
 'Ohio State University Hospital, Columbus, OH', 
 '2025-06-22T10:30:00Z',
 'completed',
 45.50,
 'no_wheelchair',
 false,
 0),

-- Trip 2 - Yesterday  
((SELECT id FROM profiles WHERE facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' LIMIT 1),
 '456 Oak Ave, Columbus, OH',
 'Mount Carmel East Hospital, Columbus, OH',
 '2025-06-21T14:15:00Z', 
 'completed',
 32.75,
 'wheelchair',
 false,
 1),

-- Trip 3 - This week
((SELECT id FROM profiles WHERE facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' LIMIT 1),
 '789 Pine St, Columbus, OH',
 'Riverside Methodist Hospital, Columbus, OH',
 '2025-06-20T09:00:00Z',
 'completed', 
 28.25,
 'no_wheelchair',
 true,
 0),

-- Trip 4 - Earlier this month
((SELECT id FROM profiles WHERE facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' LIMIT 1),
 '321 Elm St, Columbus, OH',
 'Grant Medical Center, Columbus, OH',
 '2025-06-15T16:45:00Z',
 'completed',
 38.00,
 'no_wheelchair',
 false,
 2),

-- Trip 5 - Beginning of month
((SELECT id FROM profiles WHERE facility_id = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3' LIMIT 1),
 '654 Maple Ave, Columbus, OH',
 'Nationwide Children\'s Hospital, Columbus, OH',
 '2025-06-05T11:30:00Z',
 'completed',
 52.25,
 'wheelchair',
 true,
 0);
