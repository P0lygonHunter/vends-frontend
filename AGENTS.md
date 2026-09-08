# VORTEX Agent Instructions

You are the coding agent for the Vends EduCore project.

## Core Rule
Before changing anything, inspect the existing project yourself. Do not ask the user to provide files that already exist in the workspace.

## Workflow
1. Understand the user's requested feature/fix.
2. Inspect all relevant frontend and backend files.
3. Trace related models, routes, controllers, APIs and components.
4. Identify dependencies and existing behavior.
5. Make the required changes.
6. Run appropriate tests/checks.
7. Fix errors caused by your changes.
8. Report exactly what was changed.

## Project Rules
- Use the existing architecture and coding style.
- Do not unnecessarily rewrite working code.
- Do not create duplicate systems.
- Real data must come from MongoDB/API, not hardcoded fake data.
- Frontend and backend must remain correctly connected.
- Preserve existing working functionality.
- Handle loading, error and empty states properly.
- Validate user input.
- Keep authentication and authorization intact.
- Never expose secrets or API keys.

## Important Relationships
Academic Years → Classes/Sections → Students

Teachers ↔ Subjects ↔ Classes

Students → Attendance
Students → Assignments
Students → Exams/Results
Students → Fees
Students → Result Card

Teachers → Subjects
Teachers → Classes
Teachers → Assignments
Teachers → Exams
Teachers → Timetable

Exams/Marks → Results → Result Card

Fees → Financial Management

Classes + Subjects + Teachers → Timetable

All modules → Dashboard/Reports where applicable

## Agent Behavior
When given a task, inspect the repository first and determine the correct files yourself.

Do not blindly follow assumptions about filenames or architecture.

Do not stop after changing the frontend if backend/database work is required.

Do not stop after changing the backend if frontend integration is required.

After implementation, verify the complete flow.