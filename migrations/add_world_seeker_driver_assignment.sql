-- Add or reuse driver: Mr. Jeffery D Deen
-- Then assign the driver to the active "World Seeker" tour.

WITH existing_driver AS (
  SELECT id
  FROM drivers
  WHERE lower(trim(name)) = lower(trim('Mr. Jeffery D Deen'))
    AND coalesce(trim(contact_number), '') = '076 966 9904'
  LIMIT 1
),
inserted_driver AS (
  INSERT INTO drivers (name, contact_number, vehicle_type, vehicle_number)
  SELECT 'Mr. Jeffery D Deen', '076 966 9904', 'Van', 'NE 3785'
  WHERE NOT EXISTS (SELECT 1 FROM existing_driver)
  RETURNING id
),
target_driver AS (
  SELECT id FROM existing_driver
  UNION ALL
  SELECT id FROM inserted_driver
  LIMIT 1
)
UPDATE tours
SET
  driver_id = (SELECT id FROM target_driver),
  driver_status = 'new',
  updated_at = now()
WHERE lower(trim(client_name)) = lower(trim('World Seeker'))
  AND status <> 'cancelled';
