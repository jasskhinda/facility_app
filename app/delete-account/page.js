export default function DeleteAccountPage() {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: '1.6'
    }}>
      <h1 style={{ color: '#1f2937', marginBottom: '20px' }}>Account Deletion Request</h1>

      <div style={{
        backgroundColor: '#f9fafb',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <p style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
          To request deletion of your CCT Facility Portal account and associated data, please contact us using one of the methods below:
        </p>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#374151', marginBottom: '10px' }}>Contact Information:</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>Email:</strong> <a href="mailto:info@jasskhinda.com?subject=Account%20Deletion%20Request" style={{ color: '#2563eb' }}>info@jasskhinda.com</a>
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Phone:</strong> <a href="tel:+16473556441" style={{ color: '#2563eb' }}>+1 (647) 355-6441</a>
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Website:</strong> <a href="https://facility.compassionatecaretransportation.com" style={{ color: '#2563eb' }}>facility.compassionatecaretransportation.com</a>
            </li>
          </ul>
        </div>
      </div>

      <h2 style={{ color: '#1f2937', marginTop: '30px', marginBottom: '15px' }}>What Happens When You Request Account Deletion</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#374151', fontSize: '18px', marginBottom: '10px' }}>Data That Will Be Deleted:</h3>
        <ul style={{ color: '#4b5563', paddingLeft: '20px' }}>
          <li>Your facility user profile and login credentials</li>
          <li>Client information associated with your facility</li>
          <li>Trip booking history and details</li>
          <li>Messaging history with dispatchers</li>
          <li>Saved payment methods</li>
          <li>App preferences and settings</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#374151', fontSize: '18px', marginBottom: '10px' }}>Data That May Be Retained:</h3>
        <ul style={{ color: '#4b5563', paddingLeft: '20px' }}>
          <li>Billing records and invoices (required for accounting and tax purposes)</li>
          <li>Transaction history (required for financial compliance)</li>
          <li>Anonymized usage data for service improvement</li>
        </ul>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '10px' }}>
          <em>Retention period: Up to 7 years for financial records as required by law</em>
        </p>
      </div>

      <div style={{
        backgroundColor: '#fef3c7',
        padding: '15px',
        borderRadius: '8px',
        borderLeft: '4px solid #f59e0b',
        marginTop: '30px'
      }}>
        <p style={{ margin: 0, color: '#92400e' }}>
          <strong>Please Note:</strong> Account deletion is permanent and cannot be undone. You will lose access to all trip history, client data, and billing information. Please ensure you have downloaded any necessary records before requesting deletion.
        </p>
      </div>

      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
        <h3 style={{ color: '#374151', marginBottom: '10px' }}>Processing Timeline:</h3>
        <p style={{ color: '#4b5563' }}>
          Account deletion requests are typically processed within <strong>30 days</strong> of your request. You will receive a confirmation email once your account and associated data have been permanently deleted.
        </p>
      </div>

      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          For questions about our data handling practices, please review our Privacy Policy or contact us using the information above.
        </p>
      </div>
    </div>
  );
}
