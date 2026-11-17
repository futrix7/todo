export async function GET() {
  const text = `# Taskito

## What is Taskito?
Taskito is a task and habit tracking workspace designed to help people plan their day, build routines, and monitor progress over time.

## Core features
- Task planning and prioritization
- Habit tracking with streak monitoring
- Daily check-ins and reflections
- Calendar and schedule overview
- Analytics for ongoing progress

## Typical use cases
- Organizing daily priorities
- Building sustainable habits
- Reviewing weekly consistency
- Keeping work and personal routines manageable

## Suggested key pages
- /: overview and pricing
- /login: sign in
- /register: create an account
- /tasks: task management dashboard
- /habits: habit tracking dashboard
- /calendar: schedule view
- /profile: account settings and personal analytics
`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
