-- Facility User Management Schema
-- Adds multi-user support with role-based permissions within facilities

-- Create facility_users table for managing multiple users per facility
CREATE TABLE facility_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'scheduler')),
  is_owner BOOLEAN DEFAULT FALSE,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, user_id),
  -- Ensure only one owner per facility
  CONSTRAINT unique_facility_owner UNIQUE(facility_id) WHERE is_owner = TRUE,
  -- Ensure owner is always super_admin
  CONSTRAINT owner_must_be_super_admin CHECK (NOT is_owner OR role = 'super_admin')
);

-- Create facility_contracts table for contract management
CREATE TABLE facility_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE NOT NULL,
  contract_name TEXT NOT NULL,
  contract_url TEXT NOT NULL,
  contract_type TEXT DEFAULT 'service_agreement',
  uploaded_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to protect facility owner
CREATE OR REPLACE FUNCTION protect_facility_owner()
RETURNS TRIGGER AS $
BEGIN
  -- Prevent changing owner's role
  IF OLD.is_owner = TRUE AND NEW.role != 'super_admin' THEN
    RAISE EXCEPTION 'Cannot change facility owner role from super_admin';
  END IF;
  
  -- Prevent removing owner status
  IF OLD.is_owner = TRUE AND NEW.is_owner = FALSE THEN
    RAISE EXCEPTION 'Cannot remove owner status from facility owner';
  END IF;
  
  -- Prevent deactivating owner
  IF OLD.is_owner = TRUE AND NEW.status != 'active' THEN
    RAISE EXCEPTION 'Cannot deactivate facility owner';
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Add triggers for updated_at and owner protection
CREATE TRIGGER update_facility_users_updated_at
BEFORE UPDATE ON facility_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER protect_facility_owner_trigger
BEFORE UPDATE ON facility_users
FOR EACH ROW
EXECUTE FUNCTION protect_facility_owner();

CREATE TRIGGER update_facility_contracts_updated_at
BEFORE UPDATE ON facility_contracts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE facility_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_contracts ENABLE ROW LEVEL SECURITY;

-- Policies for facility_users table
-- Super admins and admins can view all users in their facility
CREATE POLICY "Facility admins can view facility users" 
ON facility_users FOR SELECT 
USING (
  facility_id IN (
    SELECT facility_id 
    FROM facility_users 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
    AND status = 'active'
  )
);

-- Only super admins can insert new users
CREATE POLICY "Super admins can invite users" 
ON facility_users FOR INSERT 
WITH CHECK (
  facility_id IN (
    SELECT facility_id 
    FROM facility_users 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
    AND status = 'active'
  )
);

-- Super admins can update any user, admins can only update schedulers
CREATE POLICY "Facility admins can update users" 
ON facility_users FOR UPDATE 
USING (
  -- Super admins can update anyone in their facility
  (facility_id IN (
    SELECT facility_id 
    FROM facility_users 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
    AND status = 'active'
  )) OR
  -- Admins can only update schedulers in their facility
  (facility_id IN (
    SELECT facility_id 
    FROM facility_users 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND status = 'active'
  ) AND role = 'scheduler')
);

-- Only super admins can delete users, but not the facility owner
CREATE POLICY "Super admins can remove users" 
ON facility_users FOR DELETE 
USING (
  facility_id IN (
    SELECT facility_id 
    FROM facility_users 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
    AND status = 'active'
  ) AND is_owner = FALSE  -- Cannot delete facility owner
);

-- Policies for facility_contracts table
-- All facility users can view contracts
CREATE POLICY "Facility users can view contracts" 
ON facility_contracts FOR SELECT 
USING (
  facility_id IN (
    SELECT facility_id 
    FROM facility_users 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

-- Only super admins and admins can manage contracts
CREATE POLICY "Facility admins can manage contracts" 
ON facility_contracts FOR ALL 
USING (
  facility_id IN (
    SELECT facility_id 
    FROM facility_users 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
    AND status = 'active'
  )
);

-- Update existing policies to work with new user management system
-- First, let's create a helper function to check facility permissions
CREATE OR REPLACE FUNCTION check_facility_permission(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM facility_users 
    WHERE user_id = auth.uid() 
    AND role = ANY(required_roles)
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's facility ID
CREATE OR REPLACE FUNCTION get_user_facility_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT facility_id 
    FROM facility_users 
    WHERE user_id = auth.uid() 
    AND status = 'active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trips policies to work with new user management
DROP POLICY IF EXISTS "Facility admins can view their facility's trips" ON trips;
DROP POLICY IF EXISTS "Facility admins can update their facility's trips" ON trips;
DROP POLICY IF EXISTS "Facility admins can insert trips for their clients" ON trips;

-- New trips policies for facility user management
CREATE POLICY "Facility users can view facility trips" 
ON trips FOR SELECT 
USING (
  facility_id = get_user_facility_id() OR
  user_id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.facility_id = get_user_facility_id()
  )
);

-- All facility users can update trips (for status updates, etc.)
CREATE POLICY "Facility users can update facility trips" 
ON trips FOR UPDATE 
USING (
  facility_id = get_user_facility_id() OR
  user_id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.facility_id = get_user_facility_id()
  )
);

-- All facility users can create trips
CREATE POLICY "Facility users can create trips" 
ON trips FOR INSERT 
WITH CHECK (
  check_facility_permission(ARRAY['super_admin', 'admin', 'scheduler']) AND
  (facility_id = get_user_facility_id() OR
   user_id IN (
     SELECT p.id 
     FROM profiles p 
     WHERE p.facility_id = get_user_facility_id()
   ))
);

-- Update profiles policies for new user management
DROP POLICY IF EXISTS "Facility admins can view their clients' profiles" ON profiles;
DROP POLICY IF EXISTS "Facility admins can update their clients' profiles" ON profiles;
DROP POLICY IF EXISTS "Facility admins can insert clients" ON profiles;

-- New profiles policies
CREATE POLICY "Facility users can view facility profiles" 
ON profiles FOR SELECT 
USING (
  facility_id = get_user_facility_id() OR
  id = auth.uid()
);

-- All facility users can update client profiles
CREATE POLICY "Facility users can update facility profiles" 
ON profiles FOR UPDATE 
USING (
  (facility_id = get_user_facility_id() AND id != auth.uid()) OR
  id = auth.uid()
);

-- All facility users can create client profiles
CREATE POLICY "Facility users can create client profiles" 
ON profiles FOR INSERT 
WITH CHECK (
  check_facility_permission(ARRAY['super_admin', 'admin', 'scheduler']) AND
  facility_id = get_user_facility_id()
);

-- Update facilities policies
DROP POLICY IF EXISTS "Facility users can view their own facility" ON facilities;
DROP POLICY IF EXISTS "Facility users can update their own facility" ON facilities;

CREATE POLICY "Facility users can view their facility" 
ON facilities FOR SELECT 
USING (id = get_user_facility_id());

-- Only super admins and admins can update facility info
CREATE POLICY "Facility admins can update facility" 
ON facilities FOR UPDATE 
USING (
  id = get_user_facility_id() AND
  check_facility_permission(ARRAY['super_admin', 'admin'])
);

-- Function to invite a new facility user
CREATE OR REPLACE FUNCTION invite_facility_user(
  p_facility_id UUID,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role TEXT,
  p_invited_by UUID
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Validate role
  IF p_role NOT IN ('super_admin', 'admin', 'scheduler') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role');
  END IF;
  
  -- Check if inviter has permission
  IF NOT EXISTS (
    SELECT 1 FROM facility_users 
    WHERE user_id = p_invited_by 
    AND facility_id = p_facility_id 
    AND role IN ('super_admin', 'admin')
    AND status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Check if user already exists in this facility
  IF EXISTS (
    SELECT 1 FROM facility_users fu
    JOIN auth.users au ON fu.user_id = au.id
    WHERE fu.facility_id = p_facility_id 
    AND au.email = p_email
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User already exists in this facility');
  END IF;
  
  -- For now, we'll create a placeholder entry
  -- In a real implementation, this would integrate with your auth system
  v_user_id := uuid_generate_v4();
  
  INSERT INTO facility_users (facility_id, user_id, role, invited_by, status)
  VALUES (p_facility_id, v_user_id, p_role, p_invited_by, 'pending');
  
  v_result := json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'User invitation created successfully'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX idx_facility_users_facility_id ON facility_users(facility_id);
CREATE INDEX idx_facility_users_user_id ON facility_users(user_id);
CREATE INDEX idx_facility_users_role ON facility_users(role);
CREATE INDEX idx_facility_users_status ON facility_users(status);
CREATE INDEX idx_facility_contracts_facility_id ON facility_contracts(facility_id);