export async function GET() {
  const text = `# Taskito

Taskito is a productivity app for planning tasks, building habits, and tracking daily progress.

## Key pages
- /: Overview of the Taskito task and habit planner
- /login: Sign in to an existing Taskito workspace
- /register: Create a Taskito account
- /tasks: View and manage daily tasks
- /habits: Track recurring habits and streaks
- /calendar: Review scheduled work and routines

## Brand summary
Taskito helps individuals organize priorities, turn routines into habits, and reflect on daily progress in one calm workspace.
`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
