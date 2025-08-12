# Facility Owner Protection Implementation

## Overview
The facility owner protection system ensures that the main facility account holder (owner) maintains permanent Super Admin privileges and cannot be demoted or removed from the system.

## Key Features

### 1. Owner Identification
- The facility owner is identified as the earliest Super Admin user for each facility
- Owners are marked with an `is_owner` field in the `facility_users` table
- If no `is_owner` field exists, the system automatically identifies the earliest Super Admin as the owner

### 2. Owner Protection Rules
- **Role Protection**: Owner's role cannot be changed from Super Admin
- **Status Protection**: Owner cannot be deactivated or removed
- **Deletion Protection**: Owner cannot be deleted from the facility

### 3. Database Schema Changes

#### New Column
```sql
ALTER TABLE facility_users ADD COLUMN is_owner BOOLEAN DEFAULT FALSE;
```

#### Constraints
```sql
-- Ensure only one owner per facility
CONSTRAINT unique_facility_owner UNIQUE(facility_id) WHERE is_owner = TRUE;

-- Ensure owner is always super_admin
CONSTRAINT owner_must_be_super_admin CHECK (NOT is_owner OR role = 'super_admin');
```

#### Triggers
```sql
-- Protect facility owner from role changes
CREATE TRIGGER protect_facility_owner_trigger
BEFORE UPDATE ON facility_users
FOR EACH ROW
EXECUTE FUNCTION protect_facility_owner();
```

### 4. Frontend Implementation

#### Visual Indicators
- Owner badge displayed next to user's role
- "Role locked (Owner)" message instead of role dropdown
- "Protected" message instead of remove button

#### Permission Logic
- Role change dropdown is hidden for owners
- Remove button is hidden for owners
- Owner status is clearly communicated in the UI

### 5. Current Implementation Status

#### ✅ Completed
- Database schema design with owner protection
- Frontend UI updates to show owner status
- Permission logic to prevent owner changes
- Automatic owner identification for existing data
- API protection (will fail gracefully if owner changes are attempted)

#### 🔄 Pending Database Migration
The `is_owner` column needs to be added to the production database. Until then:
- The system uses automatic owner detection based on earliest Super Admin
- All protection logic is in place and will work once the column is added

### 6. Migration Steps

#### Step 1: Add Database Column
```sql
-- Run the migration script
\i facility_app/db/add_owner_field_migration.sql
```

#### Step 2: Verify Owner Assignment
```sql
-- Check that owners are correctly identified
SELECT 
    f.name as facility_name,
    p.first_name || ' ' || p.last_name as owner_name,
    p.email as owner_email,
    fu.role,
    fu.is_owner
FROM facility_users fu
JOIN facilities f ON fu.facility_id = f.id
JOIN profiles p ON fu.user_id = p.id
WHERE fu.is_owner = TRUE
ORDER BY f.name;
```

### 7. Owner Identification Logic

The system identifies facility owners using this priority:
1. User explicitly marked with `is_owner = TRUE`
2. If no owner exists, the earliest Super Admin user
3. If no Super Admin exists, the earliest user (promoted to Super Admin)

### 8. Error Handling

The system provides clear error messages when attempting to:
- Change owner's role: "Cannot change facility owner role from super_admin"
- Remove owner status: "Cannot remove owner status from facility owner"
- Deactivate owner: "Cannot deactivate facility owner"
- Delete owner: Prevented by RLS policy

### 9. Testing

#### Test Scenarios
1. ✅ Owner cannot change their own role
2. ✅ Other Super Admins cannot change owner's role
3. ✅ Owner cannot be removed from facility
4. ✅ Owner status is visually indicated in UI
5. ✅ New users can still be created normally

#### Test Commands
```bash
# Test user creation (should work)
node facility_app/test-api-logic.js

# Test owner identification
node facility_app/run-owner-migration.js
```

### 10. Future Enhancements

#### Potential Improvements
- Owner transfer functionality (with proper authorization)
- Multiple owners per facility (if business requirements change)
- Owner succession planning (backup owners)
- Audit logging for owner-related actions

## Security Considerations

1. **Database Level**: Constraints and triggers prevent unauthorized changes
2. **API Level**: Server-side validation blocks owner modifications
3. **UI Level**: Interface prevents accidental owner changes
4. **RLS Policies**: Row-level security prevents owner deletion

## Troubleshooting

### Common Issues
1. **Owner not showing**: Check if `is_owner` column exists and is populated
2. **Multiple owners**: Verify unique constraint is in place
3. **No owner identified**: Run the migration script to identify owners

### Debug Commands
```javascript
// Check current facility users
const { data } = await supabase
  .from('facility_users')
  .select('*, profiles(first_name, last_name, email)')
  .eq('facility_id', 'your-facility-id');

console.log('Facility users:', data);
```