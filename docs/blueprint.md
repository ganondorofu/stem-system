# **App Name**: Clubhouse Manager

## Core Features:

- Discord Authentication: Secure user login using Discord OAuth via Supabase Auth.
- Member Profile Management: Allow users to view and edit their profiles, including status, generation, student number, and Discord information. General users can only edit their own profile, admins can edit any profile.
- Team Management: Enable creation and management of teams, assignment of members to teams, and designation of team leaders.  Use database provided via SQL.
- Generation Role Management: Link generation numbers to Discord role IDs for automated role assignment.  Use database provided via SQL; admin only feature.
- Admin Dashboard: Provide a dashboard for administrators to manage members, teams, team leaders, and generation roles with UI-based access control.
- Safe Deletion: Implement logical deletion of member accounts for safety and data preservation, per the database SQL schema.

## Style Guidelines:

- Primary color: Deep purple (#673AB7) to evoke a sense of community and exclusivity.
- Background color: Light gray (#F5F5F5) for a clean and modern look.
- Accent color: Teal (#009688) to highlight important actions and information.
- Body and headline font: 'Inter' (sans-serif) for a clean and readable interface. Note: currently only Google Fonts are supported.
- Use consistent and recognizable icons for navigation and actions.
- A clear and intuitive layout with distinct sections for different functions.
- Subtle animations and transitions to enhance user experience.