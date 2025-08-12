-- Function to create a facility owner when a new facility is created
-- This should be called whenever a facility is created from the admin app

CREATE OR REPLACE FUNCTION create_facility_owner(
  p_facility_id UUID,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_password TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
  v_temp_password TEXT;
BEGIN
  -- Generate a temporary password if none provided
  IF p_password IS NULL THEN
    v_temp_password := 'Facility' || EXTRACT(YEAR FROM NOW()) || '!' || substring(md5(random()::text), 1, 6);
  ELSE
    v_temp_password := p_password;
  END IF;
  
  -- Check if facility exists
  IF NOT EXISTS (SELECT 1 FROM facilities WHERE id = p_facility_id) THEN
    RETURN json_build_object('success', false, 'error', 'Facility not found');
  END IF;
  
  -- Check if facility already has an owner
  IF EXISTS (
    SELECT 1 FROM facility_users 
    WHERE facility_id = p_facility_id 
    AND is_owner = TRUE 
    AND status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Facility already has an owner');
  END IF;
  
  -- Note: The actual user creation in auth.users needs to be done via the admin client
  -- This function will be called after the auth user is created
  -- For now, we'll return the information needed to create the user
  
  v_result := json_build_object(
    'success', true,
    'message', 'Ready to create facility owner',
    'facility_id', p_facility_id,
    'email', p_email,
    'first_name', p_first_name,
    'last_name', p_last_name,
    'temp_password', v_temp_password,
    'role', 'super_admin',
    'is_owner', true
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete facility owner setup after auth user is created
CREATE OR REPLACE FUNCTION complete_facility_owner_setup(
  p_facility_id UUID,
  p_user_id UUID,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Update the profile (which should have been auto-created)
  UPDATE profiles 
  SET 
    first_name = p_first_name,
    last_name = p_last_name,
    facility_id = p_facility_id,
    role = 'facility',
    email = p_email,
    status = 'active'
  WHERE id = p_user_id;
  
  -- Create facility_users entry with owner status
  INSERT INTO facility_users (
    facility_id,
    user_id,
    role,
    is_owner,
    invited_by,
    status
  ) VALUES (
    p_facility_id,
    p_user_id,
    'super_admin',
    TRUE,
    NULL, -- System created
    'active'
  );
  
  v_result := json_build_object(
    'success', true,
    'message', 'Facility owner setup completed',
    'user_id', p_user_id,
    'facility_id', p_facility_id,
    'role', 'super_admin',
    'is_owner', true
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', SQLERRM,
    'detail', 'Failed to complete facility owner setup'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;