# Cleaner Phone - Design Guidelines

## Architecture Decisions

### Authentication
**Auth Required**: Yes
- **Login Method**: Username + Password (NO SSO - accounts created by super admin only)
- **Login Screen**:
  - Company logo at top
  - Username field
  - Password field
  - "Login" button
  - No "Sign Up" option
  - No "Forgot Password" link (users contact admin)
- **Account Management**:
  - Profile screen shows username (non-editable), company ID
  - No logout button in user app (session managed by admin)
  - System-generated avatar based on username initials

### Navigation
**Root Navigation**: Drawer + Tab Bar Hybrid
- **Drawer** (left side):
  - List of all conversations
  - Search bar at top
  - New conversation button (+ icon)
  - Settings at bottom
- **Main Stack**:
  - Chats (home)
  - Active Conversation
  - Profile/Settings
- **No floating action button** - new chat initiated from drawer

### Screen Specifications

#### 1. Login Screen (Stack-Only)
- **Purpose**: Authenticate corporate user
- **Layout**:
  - Centered content, not scrollable
  - Logo at top (100x100)
  - Username input
  - Password input (obscured)
  - Login button (full width)
- **Header**: None
- **Safe Area**: top: insets.top + Spacing.xl, bottom: insets.bottom + Spacing.xl

#### 2. Conversations List (Drawer Content)
- **Purpose**: Browse all user conversations
- **Layout**:
  - **Header**: Search bar (sticky), New Chat button (top right)
  - **Content**: FlatList of conversation cards
  - Each card shows:
    - Avatar (left)
    - Name, last message preview
    - Timestamp
    - Unread badge (if applicable)
    - Timer icon (if last message was temporary)
- **Header**: Custom, transparent
- **Safe Area**: top: headerHeight + Spacing.xl, bottom: insets.bottom + Spacing.xl

#### 3. Active Conversation Screen
- **Purpose**: Send/receive messages and media
- **Layout**:
  - **Header**: Custom, non-transparent background
    - Left: Back button
    - Center: User name + online status
    - Right: Info button (shows conversation settings)
  - **Content**: Inverted FlatList (messages from bottom)
  - **Input Area** (bottom, floating):
    - Text input field
    - Attachment button (camera icon)
    - Timer toggle (clock icon)
    - Send button
- **Message Bubbles**:
  - Sent: aligned right, primary color background
  - Received: aligned left, neutral background
  - Timer badge on temporary messages (countdown or "👁 View Once")
  - Blur effect on view-once media before opened
- **Safe Area**: 
  - Top: Spacing.xl (header is opaque)
  - Bottom: insets.bottom + 60 (input bar height)

#### 4. Message Timer Selector (Modal)
- **Purpose**: Set message expiration
- **Layout**: Bottom sheet modal
- **Options**:
  - View Once (disappears after read)
  - 1 minute
  - 1 hour
  - 24 hours
  - Permanent (default)
- **Interaction**: Tap option to select, modal dismisses

#### 5. Profile/Settings Screen
- **Purpose**: View user info and app settings
- **Layout**:
  - **Header**: Default navigation, "Profile" title
  - **Content**: Scrollable sections
    - User avatar (system-generated initials)
    - Username (non-editable)
    - Company ID (read-only)
    - App version
    - Privacy notice (corporate monitoring disclosure)
- **Safe Area**: top: insets.top + Spacing.xl, bottom: insets.bottom + Spacing.xl

#### 6. Super Admin Web Portal (Not mobile)
- Separate web application (not covered in mobile guidelines)
- Monitoring dashboard for location, camera, mic access
- User management interface

## Design System

### Color Palette
- **Primary**: #2C5F8D (Corporate blue - trust, security)
- **Primary Dark**: #1A3A56
- **Secondary**: #4A90A4 (Lighter blue - accents)
- **Background**: #F5F7FA (Light neutral)
- **Surface**: #FFFFFF
- **Text Primary**: #1F2937
- **Text Secondary**: #6B7280
- **Danger**: #DC2626 (timer warnings, view-once)
- **Success**: #10B981
- **Border**: #E5E7EB

### Typography
- **Headings**: System Bold, 20-24pt
- **Body**: System Regular, 16pt
- **Captions**: System Regular, 14pt (timestamps, metadata)
- **Input Text**: System Regular, 16pt

### Spacing
- xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32

### Component Specifications

#### Message Bubble
- Padding: Spacing.md
- Border radius: 16
- Max width: 75% of screen width
- Shadow on sent messages:
  - shadowOffset: {width: 0, height: 1}
  - shadowOpacity: 0.05
  - shadowRadius: 2

#### Timer Badge
- Small pill shape on message corner
- Background: rgba(220, 38, 38, 0.1)
- Text: Danger color, 12pt
- Icon: Clock (Feather icon)

#### View-Once Indicator
- Eye icon with slash (Feather: eye-off)
- Appears on media thumbnail before viewing
- BlurView overlay with blur intensity: 50

#### Input Bar (Floating)
- Background: Surface color
- Border top: 1px, Border color
- Shadow:
  - shadowOffset: {width: 0, height: -2}
  - shadowOpacity: 0.05
  - shadowRadius: 4
- Height: 56
- Padding: Spacing.md

#### Conversation Card
- Press feedback: scale to 0.98, opacity 0.7
- Height: 72
- Border bottom: 1px, Border color
- Active press: Background changes to #F3F4F6

### Visual Design
- **Icons**: Feather icons from @expo/vector-icons
- **NO EMOJIS** - use system icons only
- Minimal use of shadows (only for floating elements)
- Consistent 16px border radius for cards and inputs

### Critical Assets
1. **App Logo**: "Cleaner Phone" wordmark + icon (128x128)
   - Clean, minimalist design
   - Corporate blue color scheme
   - Icon: Abstract phone with shield symbol
2. **System-generated Avatars**: Initials-based circles
   - Background: gradient from Primary to Secondary
   - White text: first 2 letters of username
3. **Empty State Illustration**: No conversations yet
   - Simple line art of chat bubbles
   - Neutral gray color

### Accessibility
- All text meets WCAG AA contrast requirements
- Touch targets minimum 44x44
- Keyboard navigation support for web portal
- Screen reader labels for all interactive elements
- Timer countdown announced for accessibility

### Platform Notes
- **iOS**: Follow HIG, use native haptics for send/receive
- **Android**: Use Material Design ripple effects
- Background location/camera/mic permissions required with clear disclosure during onboarding
- Corporate disclosure screen before login: "This app monitors location, camera, and microphone for security purposes"