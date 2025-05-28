# Compassionate Rides Facility App

## Overview
The Compassionate Rides Facility App is a specialized transportation booking system designed for healthcare facilities (hospitals, nursing homes, rehabilitation centers, etc.) to manage transportation services for their clients with unique needs and medical requirements.

## User Roles

### 1. Facility Administrator
- Manages facility settings and information
- Creates and manages client profiles
- Books rides on behalf of clients
- Tracks trip status and history
- Manages payment methods

### 2. Client
- Users who receive transportation services
- Associated with a specific facility
- Have specific accessibility and medical needs

### 3. Dispatcher
- Receives and approves trip requests
- Assigns drivers to trips
- Not a direct user of the facility app, but receives notifications

## Core Features

### Authentication
- Secure login for facility administrators
- Role-based access control
- Session persistence for ease of use

### Facility Management
- Facility profile management (name, address, contact information)
- Facility type selection (hospital, nursing home, rehabilitation center, etc.)
- Billing email management
- Payment method management

### Client Management
- Create and manage client profiles
- View client details (name, contact info, address)
- Record accessibility needs and medical requirements
- Search and filter clients
- Associate clients with facility

### Trip Booking
- Book trips on behalf of clients
- Address input with location autocomplete
- Date and time selection
- Wheelchair requirements specification
- Round trip option
- Route visualization
- Fare estimation based on distance, time, and requirements
- Special instructions/notes for drivers
- Payment method selection (facility or client payment)

### Trip Management
- View all trips booked by the facility
- Filter trips by status (pending, upcoming, completed, cancelled)
- View trip details (client, addresses, time, status)
- Track active trips in real-time
- Rate and provide feedback for completed trips

### Notifications
- Email notifications to dispatchers for new trip requests
- Status updates for trip approval, driver assignment, etc.

## User Experience

### Dashboard
- Overview of recent trips
- Quick access to booking and client management
- Statistics on completed trips and spending

### Mobile Responsiveness
- Works on desktop and mobile devices
- Optimized views for different screen sizes

### Accessibility
- Designed for WCAG compliance
- High contrast mode
- Screen reader compatibility

### Dark Mode Support
- Full dark mode theme
- Automatic switching based on system preferences
- Manual toggle option

## Data Privacy and Security
- Secure handling of personal information
- Role-based data access
- Privacy-focused design
- Secure payment processing