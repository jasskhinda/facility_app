# Facility Owner Creation Process

## Overview
This document describes how facility owners are automatically created when new facilities are added through the admin app, and how to create owners for existing facilities.

## Automatic Owner Creation

### When Creating a New Facility
When a facility is created through the admin app, you can optionally include owner information to automatically create the facility owner:

```javascript
// Facility creation with owner data
const facilityData = {
  name: "New Medical Center",
  address: "123 Main St",
  phone: "555-0123",
  email: "contact@newmedical.com",
  // Owner information (optional)
  ownerEmail: "admin@newmedical.com",
  ownerFirstName: "John",
  ownerLastName: "Smith",
  ownerPassword: "SecurePassword123!" // Optional, will be auto-generated if not provided
};
```

### API Endpoints

#### 1. Create Facility with Owner (Admin App)
```
POST /api/create-facility
```
- Creates facility and optionally creates owner if owner data is provided
- Returns facility info and owner credentials

#### 2. Create Facility Owner (Standalone)
```
POST /api/admin/create-facility-owner
```
- Creates owner for existing facility
- Requires admin key for security

#### 3. Create Facility Owner (Admin App)
```
POST /api/create-facility-owner
```
- Admin-only endpoint to create facility owners
- Validates admin permissions

## Manual Owner Creation

### For Existing Facilities Without Owners

#### Option 1: Use the API
```bash
curl -X POST https://facility.compassionatecaretransportation.com/api/admin/create-facility-owner \
  -H "Content-Type: application/json" \
  -d '{
    "facilityId": "facility-uuid-here",
    "email": "owner@facility.com",
    "firstName": "Owner",
    "lastName": "Name",
    "adminKey": "your-admin-key"
  }'
```

#### Option 2: Use the Script
```bash
# Run the script to create owners for all facilities without them
node facility_app/create-missing-owners.js
```

#### Option 3: Manual Database Setup
```sql
-- If you need to manually create an owner in the database
-- (after creating the auth user through Supabase dashboard)

-- 1. Update the profile
UPDATE profiles 
SET 
  first_name = 'Owner',
  last_name = 'Name',
  facility_id = 'facility-uuid-here',
  role = 'facility',
  email = 'owner@facility.com',
  status = 'active'
WHERE id = 'user-uuid-here';

-- 2. Create facility_users entry
INSERT INTO facility_users (
  facility_id,
  user_id,
  role,
  is_owner,
  status
) VALUES (
  'facility-uuid-here',
  'user-uuid-here',
  'super_admin',
  TRUE,
  'active'
);
```

## Owner Properties

### Automatic Owner Identification
If no explicit owner is set, the system automatically identifies owners using this logic:
1. User explicitly marked with `is_owner = TRUE`
2. If no owner exists, the earliest Super Admin user
3. If no Super Admin exists, the earliest user (promoted to Super Admin)

### Owner Characteristics
- **Role**: Always `super_admin` in `facility_users` table
- **Profile Role**: `facility` in `profiles` table
- **Owner Status**: `is_owner = TRUE`
- **Protection**: Cannot be demoted or removed
- **Permissions**: Full access to all facility features

## Security Considerations

### Admin Key Protection
The standalone API requires an admin key for security:
```bash
# Set in environment variables
FACILITY_ADMIN_KEY=your-secure-admin-key-here
```

### Password Generation
If no password is provided, the system generates secure passwords:
- Format: `FacilityName2025!randomchars`
- Example: `GreenValley2025!abc123`

### Owner Protection
Once created, facility owners are protected by:
- Database constraints preventing role changes
- Triggers blocking owner modifications
- RLS policies preventing deletion
- UI restrictions hiding modification options

## Integration with Admin App

### Modified Facility Creation Flow
1. Admin creates facility through admin app
2. If owner data is provided, system automatically:
   - Creates auth user for owner
   - Updates profile with facility association
   - Creates facility_users entry with owner status
3. Returns facility info and owner credentials

### Error Handling
- If facility creation succeeds but owner creation fails, facility is still created
- Owner can be created later using standalone APIs
- All operations are logged for debugging

## Testing

### Test Owner Creation
```javascript
// Test the API
const response = await fetch('/api/admin/create-facility-owner', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    facilityId: 'test-facility-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'Owner',
    adminKey: process.env.FACILITY_ADMIN_KEY
  })
});
```

### Verify Owner Status
```sql
-- Check facility owners
SELECT 
  f.name as facility_name,
  p.first_name || ' ' || p.last_name as owner_name,
  p.email,
  fu.role,
  fu.is_owner
FROM facility_users fu
JOIN facilities f ON fu.facility_id = f.id
JOIN profiles p ON fu.user_id = p.id
WHERE fu.is_owner = TRUE
ORDER BY f.name;
```

## Troubleshooting

### Common Issues

#### 1. Facility Already Has Owner
```json
{
  "error": "Facility already has an owner",
  "status": 409
}
```
**Solution**: Check existing owners or use update APIs instead

#### 2. Invalid Admin Key
```json
{
  "error": "Invalid admin key",
  "status": 403
}
```
**Solution**: Verify `FACILITY_ADMIN_KEY` environment variable

#### 3. Email Already Exists
```json
{
  "error": "A user with this email address has already been registered",
  "status": 400
}
```
**Solution**: Use different email or associate existing user

### Debug Commands
```bash
# Check facilities without owners
node facility_app/run-owner-migration.js

# Create missing owners
node facility_app/create-missing-owners.js

# Test API directly
curl -X POST localhost:3000/api/admin/create-facility-owner \
  -H "Content-Type: application/json" \
  -d '{"facilityId":"uuid","email":"test@test.com","firstName":"Test","lastName":"User","adminKey":"key"}'
```

## Future Enhancements

### Planned Features
- Owner transfer functionality
- Bulk owner creation interface
- Owner invitation system with email notifications
- Multi-owner support (if business requirements change)
- Integration with facility onboarding workflow