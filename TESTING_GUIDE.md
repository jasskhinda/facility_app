# Facility User Management Testing Guide

## 🚀 Quick Start Testing

### Step 1: Database Setup Check
```bash
# Run the setup check script
cd facility_app
node check-user-management-setup.js
```

**Expected Output:**
- ✅ All tables exist and are accessible
- ✅ Database functions are working
- ✅ Existing facilities found
- ⚠️ May show migration needed if you have legacy users

### Step 2: Apply Database Schema (if needed)
If the setup check shows missing tables:

1. **Connect to your Supabase database**
2. **Run the schema file:**
   ```sql
   -- Copy and paste the contents of:
   -- facility_app/db/facility_user_management_schema.sql
   ```
3. **Run migration (if you have existing facilities):**
   ```sql
   -- Copy and paste the contents of:
   -- facility_app/db/migrate_existing_facilities.sql
   ```

### Step 3: Test the UI Components

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to facility settings:**
   - Go to `/dashboard/facility-settings`
   - You should see 4 tabs: 🏥 Facility Info, 👥 User Management, 📋 Contracts, 🔒 Security

3. **Run browser tests:**
   - Open browser console (F12)
   - Copy and paste the contents of `test-user-management-ui.js`
   - Check the console output for test results

## 🧪 Detailed Testing Scenarios

### Scenario 1: Super Admin Testing
**Prerequisites:** You need to be logged in as a facility user

1. **Check your role:**
   - Go to Security tab
   - Your role should show as "Super Admin" (if migrated) or you need to be added to facility_users table

2. **Test User Management:**
   - Click "User Management" tab
   - You should see "Invite User" button
   - Try inviting a test user:
     - Email: `test@example.com`
     - Name: `Test User`
     - Role: `Scheduler`

3. **Test Contract Management:**
   - Click "Contracts" tab
   - You should see "Upload Contract" button
   - Try uploading a test document

### Scenario 2: Admin Testing
**Prerequisites:** Create an admin user first

1. **Create admin user** (as super admin):
   - Invite user with "Admin" role
   - Check they can access most features
   - Verify they can't manage other admins

2. **Test admin limitations:**
   - Admin should see invite button
   - Admin should only see "Scheduler" and "Admin" options when inviting
   - Admin cannot change super admin roles

### Scenario 3: Scheduler Testing
**Prerequisites:** Create a scheduler user

1. **Create scheduler user:**
   - Invite user with "Scheduler" role
   - Check they have limited access

2. **Test scheduler limitations:**
   - No "Invite User" button
   - Facility info fields should be disabled
   - Can view contracts but not upload
   - Can access booking and client management

## 🔍 Manual Verification Checklist

### Database Verification
- [ ] `facility_users` table exists with correct columns
- [ ] `facility_contracts` table exists with correct columns
- [ ] RLS policies are active (check with `\d+ facility_users` in psql)
- [ ] Helper functions exist (`check_facility_permission`, `get_user_facility_id`)

### UI Verification
- [ ] Tabbed interface loads correctly
- [ ] Role-based button visibility works
- [ ] Form fields are disabled based on permissions
- [ ] Error messages display properly
- [ ] Loading states work correctly

### API Verification
- [ ] `/api/facility/users` endpoints respond correctly
- [ ] Authentication is required for API calls
- [ ] Permission checks work in API
- [ ] Error responses are properly formatted

### Permission Verification
- [ ] Super admin can manage all users
- [ ] Admin can only manage schedulers
- [ ] Scheduler cannot manage users
- [ ] Contract upload restricted to admin/super admin
- [ ] Facility info editing restricted to admin/super admin

## 🐛 Common Issues & Solutions

### Issue: "facility_users table not found"
**Solution:** Run the database schema file first
```sql
-- Apply facility_user_management_schema.sql to your database
```

### Issue: "User not found in facility"
**Solution:** Add user to facility_users table
```sql
INSERT INTO facility_users (facility_id, user_id, role, status)
VALUES ('your-facility-id', 'your-user-id', 'super_admin', 'active');
```

### Issue: "Permission denied" errors
**Solution:** Check RLS policies are applied
```sql
-- Verify policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('facility_users', 'facility_contracts');
```

### Issue: Components not loading
**Solution:** Check imports and dependencies
```bash
# Verify all files exist
ls -la app/components/Facility*
ls -la app/hooks/useFacilityUsers.js
ls -la app/api/facility/users/
```

### Issue: Invite function not working
**Solution:** Check database function exists
```sql
-- Test the invite function
SELECT invite_facility_user(
  'facility-id'::uuid,
  'test@example.com',
  'Test',
  'User',
  'scheduler',
  'your-user-id'::uuid
);
```

## 📊 Success Criteria

Your facility user management system is working correctly when:

1. **✅ Database Setup:**
   - All tables and functions exist
   - RLS policies are active
   - Migration completed (if applicable)

2. **✅ UI Functionality:**
   - Tabs switch correctly
   - Role-based restrictions work
   - Forms submit successfully
   - Error handling works

3. **✅ User Management:**
   - Can invite users with appropriate roles
   - Role updates work correctly
   - User removal works
   - Permission checks prevent unauthorized actions

4. **✅ Contract Management:**
   - Can view contracts (all users)
   - Can upload contracts (admin/super admin only)
   - Contract types and metadata work

5. **✅ Security:**
   - API requires authentication
   - Database policies prevent unauthorized access
   - UI hides restricted features appropriately

## 🎯 Next Steps After Testing

Once testing is complete:

1. **Production Deployment:**
   - Apply schema to production database
   - Run migration for existing users
   - Test with real user accounts

2. **Email Integration:**
   - Configure email service (SendGrid, AWS SES, etc.)
   - Test invitation emails
   - Set up email templates

3. **User Training:**
   - Create user guides for each role
   - Train facility staff on new features
   - Set up support processes

4. **Monitoring:**
   - Set up error tracking
   - Monitor user adoption
   - Collect feedback for improvements