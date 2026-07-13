Document 06 is one of the most important documents for InverBrass, because your competitive advantage is simplicity, not feature count.
Below is the version I recommend for your architecture repository.
________________________________________
06 – UI/UX Standards & Design System
1. Document Information
Attribute	Value
Document Name	UI/UX Standards & Design System
Version	1.0
Purpose	Defines the user experience principles, interface standards, reusable components and design guidelines that ensure a consistent, intuitive and mobile-first experience across all Industry Solutions.
Scope	Entire InverBrass Business Platform
Audience	Product Owner, UX Designers, Developers, AI Coding Assistants
________________________________________
2. Design Philosophy
Principle	Description
Mobile First	Design primarily for smartphones before tablets and desktops.
Self-Service First	Users should complete business tasks without requiring training or support.
Simplicity First	Prioritize ease of use over feature density.
Configuration First	User experiences should adapt through configuration instead of custom development.
Consistency First	Similar actions should behave consistently across all Industry Solutions.
Accessibility First	Interfaces should be usable by people with different abilities and varying digital literacy.
Progressive Disclosure	Show only essential information first and reveal advanced options when needed.
________________________________________
3. User Experience Principles
Principle	Description
Three-Tap Rule	Common business tasks should be completed in three taps or fewer wherever practical.
One-Handed Operation	Mobile screens should be usable comfortably with one hand.
Minimal Data Entry	Reduce typing through defaults, lookups, scanning and intelligent suggestions.
Immediate Feedback	Every action provides clear confirmation or guidance.
Error Prevention	Prevent errors before they occur through validation and guided workflows.
Undo Before Delete	Allow users to recover from accidental actions whenever possible.
Meaningful Empty States	Empty screens should guide users on what to do next.
________________________________________
4. Navigation Standards
Device	Navigation Standard
Mobile	Bottom Navigation Bar with contextual menus.
Tablet	Navigation Rail with collapsible menu.
Desktop	Left Sidebar Navigation with top toolbar.
Progressive Web App	Responsive navigation optimized for installed experiences.
________________________________________
5. Screen Layout Standards
Every screen should follow a consistent structure.
Screen Section	Purpose
Header	Screen title and context.
Search	Quick search and filtering.
Quick Actions	Frequently used actions.
Main Content	Primary business information.
Context Panel	Optional details or secondary information.
Floating Action Button	Primary create action on mobile where appropriate.
Footer	Status and supplementary actions where required.
________________________________________
6. Form Design Standards
Standard	Description
Short Forms	Display only essential fields initially.
Progressive Forms	Reveal additional fields only when required.
Inline Validation	Validate as users enter information.
Auto Save	Save drafts automatically where appropriate.
Smart Defaults	Pre-populate common values.
Lookup Controls	Use searchable dropdowns instead of long lists.
Input Assistance	Support barcode scanning, QR scanning, date pickers and autofill.
________________________________________
7. Data Presentation Standards
Data Type	Mobile	Desktop
Lists	Cards	Tables
Dashboards	KPI Cards	KPI Cards + Charts
Reports	Summary Cards	Detailed Tables
Documents	Mobile Viewer	Full Viewer
Analytics	Simple Charts	Interactive Charts
________________________________________
8. Standard UI Components
Component	Purpose
Button	Execute actions
Card	Present summarized information
Table	Display structured data
Search Bar	Locate records quickly
Filter Panel	Narrow search results
Modal Dialog	Confirm actions
Bottom Sheet	Mobile contextual actions
Tabs	Organize related information
Stepper	Multi-step processes
KPI Card	Display business metrics
Chart	Visualize trends
Notification	Inform users of system events
________________________________________
9. Responsive Design Standards
Device	Behaviour
Mobile	Primary experience with simplified layouts.
Tablet	Optimized for touch and increased workspace.
Desktop	Enhanced productivity with multi-column layouts.
PWA	Native-like experience with offline capability.
________________________________________
10. Branding Standards
Element	Standard
Primary Colour	InverBrass Gold
Secondary Colour	InverBrass Dark Blue
Background	White and Light Grey
Success	Green
Warning	Amber
Error	Red
Information	Blue
Typography	Clean, modern sans-serif font optimized for readability.
Icons	Simple, universally recognizable iconography.
________________________________________
11. Dashboard Standards
Component	Description
Welcome Panel	Personalized greeting and business summary.
KPI Cards	Key business metrics.
Quick Actions	Frequently used business actions.
Recent Activity	Latest transactions and notifications.
Tasks	Pending approvals and reminders.
AI Insights	Recommendations and business alerts from the Enterprise Intelligence Engine.
________________________________________
12. Offline Experience Standards
Standard	Description
Offline Indicator	Clearly display connectivity status.
Local Transactions	Continue capturing business transactions while offline.
Automatic Synchronization	Synchronize automatically when connectivity returns.
Conflict Resolution	Resolve synchronization conflicts using configurable business rules.
User Notification	Inform users when synchronization succeeds or fails.
________________________________________
13. AI User Experience Standards
Principle	Description
Explainable AI	AI recommendations should include clear explanations.
Human Approval	AI should recommend—not automatically approve—critical business decisions.
Confidence Indicator	Display AI confidence where applicable.
User Override	Users retain final decision-making authority.
Continuous Learning	AI models improve through user feedback where appropriate.
________________________________________
14. Accessibility Standards
Standard	Description
Readable Typography	Clear font sizes and spacing.
Colour Contrast	Meet accessibility contrast guidelines.
Keyboard Support	Desktop navigation supports keyboard shortcuts.
Touch Targets	Buttons and controls sized for touch interaction.
Screen Reader Support	Semantic structure supports assistive technologies where applicable.
________________________________________
15. Design Governance
Principle	Description
Component Reuse	Use standard components before creating new ones.
Consistent Behaviour	Similar actions behave consistently across all Industry Solutions.
Design Before Development	User experience should be reviewed before implementation.
Mobile Validation	Every feature is validated on mobile before desktop optimization.
Configuration Driven	Screens adapt based on tenant configuration and enabled capabilities.
________________________________________
16. Architecture Compliance Rules
Rule	Description
Business Alignment	User interfaces must support approved business processes and requirements.
Architecture Compliance	Screens must align with the Enterprise Solution Architecture, Platform Module Catalog and Domain Model.
Cursor Rules Compliance	Generated UI code must comply with the project's .cursorrules and coding standards.
Component Standards	Only approved design system components should be used unless explicitly justified.
Self-Service Validation	Every new feature should be evaluated against the Self-Service First principle.
________________________________________
17. UX Success Metrics
Metric	Target
Time to Complete Common Task	Less than 60 seconds
User Onboarding Time	Less than 15 minutes without training
Average Taps for Common Tasks	Three or fewer wherever practical
Mobile Usability	Primary experience optimized for smartphones
Offline Availability	Critical business functions remain available
Support Dependency	Minimized through intuitive design and guided workflows
Accessibility	Comply with recognized accessibility practices appropriate for the platform
________________________________________
Architect's Recommendation
This document should become the single source of truth for every screen Cursor generates.
Whenever a new screen is built, it should pass this checklist:
•	Is it mobile-first?
•	Is it simple enough for an SME owner?
•	Can the task be completed with minimal taps and typing?
•	Does it support offline operation where required?
•	Does it reuse standard UI components?
•	Does it follow the InverBrass Design System?
•	Does it remain configuration-driven rather than hard-coded?
If the answer to any of these questions is no, the design should be revisited before implementation.
________________________________________

