# Facility User Management System

## Overview

The Facility User Management system allows healthcare facilities to manage multiple staff members with different permission levels for booking and managing transportation services.

## Permission Levels

### Super Admin
- **Full Access**: Can manage all aspects of the facility
- **User Management**: Can add/remove admins and schedulers
- **Permissions**: All tabs and features available
- **Typical Role**: Facility owner, primary administrator

### Admin  
- **Limited User Management**: Can add/remove schedulers (but not other admins)
- **Full Feature Access**: Can see all tabs and manage facility operations
- **Permissions**: Everything except managing other admins
- **Typical Role**: Department head, senior staff member

### Scheduler
- **Booking Focus**: Can book rides and manage clients
- **Limited Access**: Cannot manage other users or facility settings
- **Permissions**: Booking, client management, contract viewing
- **Typical Role**: Front desk staff, schedulers

## Database Schema

### facility_users Table
```sql
- id: UUID (Primary Key)
- facility_id: UUID (Foreign Key to facilities)
- user_id: UUID (Foreign Key to auth.users)
- role: TEXT ('super_admin', 'admin', 'scheduler')
- status: TEXT ('active', 'inactive', 'pending')
- invited_by: UUID (Foreign Key to auth.users)
- invited_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### facility_contracts Table
```sql
- id: UUID (Primary Key)
- facility_id: UUID (Foreign Key to facilities)
- contract_name: TEXT
- contract_url: TEXT
- contract_type: TEXT
- uploaded_by: UUID (Foreign Key to auth.users)
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

## Components

### FacilitySettings.js
Main settings component with tabbed interface:
- **Facility Info**: Basic facility information (admin/super_admin only can edit)
- **User Management**: Invite and manage facility users
- **Contracts**: View and upload facility contracts
- **Security**: Password and account security settings

### FacilityUserManagement.js
Handles user invitation and role management:
- User invitation modal
- Role assignment and updates
- User removal
- Permission-based UI restrictions

### ContractViewer.js
Contract management interface:
- View uploaded contracts
- Upload new contracts (admin/super_admin only)
- Download contracts
- Contract type categorization

## API Endpoints

### GET /api/facility/users
Fetch facility users with profile information
- **Permissions**: Admin, Super Admin
- **Returns**: List of facility users with roles and status

### POST /api/facility/users
Invite new facility user
- **Permissions**: Super Admin only
- **Body**: `{ facilityId, email, firstName, lastName, role }`
- **Returns**: Success/error response

### PATCH /api/facility/users
Update user role or remove user
- **Permissions**: Based on action and target user role
- **Body**: `{ facilityId, userId, role?, action }`
- **Actions**: 'update_role', 'remove'

## Hooks

### useFacilityUsers
Custom hook for facility user management:
```javascript
const {
  users,           // Array of facility users
  loading,         // Loading state
  error,           // Error message
  currentUserRole, // Current user's role
  inviteUser,      // Function to invite new user
  updateUserRole,  // Function to update user role
  removeUser,      // Function to remove user
  canInviteUsers,  // Permission check
  canUpdateUser,   // Permission check function
  canRemoveUser    // Permission check function
} = useFacilityUsers(facilityId, currentUser);
```

## Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies restrict access based on facility membership and role
- Users can only access data for their assigned facility

### Permission Checks
- Database-level permission functions
- API-level permission validation
- UI-level permission restrictions
- Action-specific permission checks

### Audit Trail
- Track who invited each user
- Timestamp all user actions
- Maintain user status history

## Migration Guide

### For Existing Facilities
1. Run the migration script: `migrate_existing_facilities.sql`
2. Existing facility users become Super Admins automatically
3. Verify migration with provided queries
4. Test user management functionality

### New Facility Setup
1. Create facility record
2. First user is automatically assigned Super Admin role
3. Super Admin can invite additional users as needed

## Email Integration

### Invitation Emails
- Automatic email sending on user invitation
- Role-specific welcome messages
- Secure invitation links with expiration
- Integration ready for SendGrid, AWS SES, etc.

### Email Service Setup
```javascript
// Configure in emailService.js
import { EmailService } from '@/app/services/emailService';

await EmailService.sendFacilityInvitation({
  recipientEmail: 'user@example.com',
  recipientName: 'John Doe',
  facilityName: 'Memorial Hospital',
  inviterName: 'Jane Admin',
  role: 'scheduler',
  invitationLink: 'https://app.com/accept-invitation?token=...'
});
```

## Best Practices

### User Management
1. **Principle of Least Privilege**: Assign minimum necessary permissions
2. **Regular Audits**: Review user access periodically
3. **Offboarding**: Remove users promptly when they leave
4. **Role Clarity**: Ensure users understand their permissions

### Security
1. **Strong Passwords**: Enforce password requirements
2. **Session Management**: Implement proper session timeouts
3. **Access Logging**: Monitor user actions
4. **Regular Updates**: Keep dependencies updated

### Contract Management
1. **Version Control**: Keep contract versions organized
2. **Access Control**: Ensure all staff can view current contracts
3. **Regular Updates**: Keep contracts current
4. **Backup**: Maintain contract backups

## Troubleshooting

### Common Issues

#### User Can't Access Features
- Check user role and status in `facility_users` table
- Verify facility_id matches
- Check RLS policies are applied correctly

#### Invitation Not Working
- Verify email service configuration
- Check invitation link generation
- Confirm user doesn't already exist

#### Permission Errors
- Review role-based access controls
- Check API endpoint permissions
- Verify database policies

### Debug Queries
```sql
-- Check user permissions
SELECT fu.role, fu.status, f.name as facility_name
FROM facility_users fu
JOIN facilities f ON fu.facility_id = f.id
WHERE fu.user_id = 'user-id-here';

-- Check facility user count
SELECT f.name, COUNT(fu.id) as user_count
FROM facilities f
LEFT JOIN facility_users fu ON f.id = fu.facility_id
WHERE fu.status = 'active'
GROUP BY f.id, f.name;
```

## Future Enhancements

### Planned Features
- [ ] Bulk user import/export
- [ ] Advanced permission granularity
- [ ] User activity logging
- [ ] Role templates
- [ ] Multi-facility user support
- [ ] SSO integration
- [ ] Mobile app support

### Integration Opportunities
- [ ] Calendar integration for scheduling
- [ ] Slack/Teams notifications
- [ ] Advanced reporting dashboard
- [ ] API rate limiting
- [ ] Webhook support

## Support

For technical support or questions about the facility user management system:
1. Check this documentation first
2. Review the troubleshooting section
3. Check database logs for errors
4. Contact the development team with specific error messages

---

*Last updated: [Current Date]*
*Version: 1.0.0*