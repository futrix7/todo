# About Taskflow

Taskflow is a personal productivity app that turns everyday tasks into a daily
habit. It combines a to-do list with advanced scheduling, streak tracking,
daily mood check-ins, analytics, and a small social layer for friends and
community challenges.

The guiding idea is simple: **showing up every day counts**. Saving a check-in,
adding a task, or completing a task all keep your daily streak alive. Progress
is visible, gentle, and yours.

---

## Table of contents

- [At a glance](#at-a-glance)
- [Pages and routes](#pages-and-routes)
- [Features](#features)
  - [Tasks](#tasks)
  - [Streaks](#streaks)
  - [Days and mood check-ins](#days-and-mood-check-ins)
  - [Friends](#friends)
  - [Challenges](#challenges)
  - [Friends leaderboard](#friends-leaderboard)
  - [Notifications](#notifications)
  - [Profile](#profile)
  - [Analytics](#analytics)
  - [Settings](#settings)
  - [Help and support](#help-and-support)
  - [Accounts and authentication](#accounts-and-authentication)
- [Theme and visual design](#theme-and-visual-design)
- [Layout and navigation](#layout-and-navigation)
- [Motion and feedback](#motion-and-feedback)
- [Accessibility](#accessibility)
- [Data and privacy](#data-and-privacy)
- [Current limitations and coming soon](#current-limitations-and-coming-soon)

---

## At a glance

- **Daily planning** with priorities, categories, due dates, start times,
  durations, repeat rules, and named groups for organizing related tasks.
- **Streaks** for your overall routine and for individual tracked tasks.
- **Mood check-ins** with emoji ratings, notes, and up/down day ratings.
- **Analytics** across task activity, categories, focus time, and mood.
- **Friends** with requests, profiles, and a friends-only leaderboard.
- **Community challenges** across Fitness, Mind, Discipline, Productivity,
  and Money.
- **Light, dark, and system themes** with a calm blue accent.
- **Mobile-first interface** with a floating bottom navigation bar that also
  works well on desktop.
- **Achievements** that unlock as you build momentum.

---

## Pages and routes

| Page | Route | Who can see it |
| --- | --- | --- |
| Landing page | `/` | Visitors |
| Login | `/login` | Visitors |
| Register | `/register` | Visitors |
| Forgot password | `/forgot-password` | Visitors |
| Reset password | `/reset-password` | Visitors with a valid reset link |
| Tasks | `/tasks` | Signed-in users |
| Streaks | `/streak` | Signed-in users |
| Days | `/days` | Signed-in users |
| Friends | `/friends` | Signed-in users |
| Challenges | `/friends/challenges` | Signed-in users |
| Leaderboard | `/friends/leaderboard` | Signed-in users |
| Notifications | `/notifications` | Signed-in users |
| Profile | `/profile` | Signed-in users |
| Analytics | `/profile/analytics` | Signed-in users |
| Settings | `/profile/settings` | Signed-in users |
| Help & support | `/profile/help` | Signed-in users |

Signed-out visitors are redirected to login when they open a private page.
Signed-in users who open the landing, login, or register pages are taken
straight to their tasks.

---

## Features

### Tasks

The heart of the app. The Tasks page shows today's list with a completion
progress bar and three filters: **All**, **Active**, and **Done**.

**Task groups.** Create named groups such as Work, Home, or Projects, switch
between group lists, and assign tasks to a group when creating or editing them.
Group names and membership are private to your account.

Each task can hold:

| Field | Options / behavior |
| --- | --- |
| Title | Required |
| Notes | Optional free text |
| Priority | Low, Medium, High |
| Category | Work, Personal, Health, Learning, Finance, Challenge |
| Due date | Any calendar date |
| Start time | Any time of day |
| Duration | 15, 30, 45, 60, 90, 120, or 180 minutes |
| Repeat | Does not repeat, Every day, Every weekday, Every week, Every month |
| Reminder | On or off |
| Track streak | On or off |

**Simple and Advanced modes.** The task dialog opens in Simple mode with just a
title and notes. Switch to the Advanced tab to reveal scheduling, priority,
category, repeat, reminder, and streak options. Editing a task opens directly
in Advanced mode.

**Task actions.** Complete a task with its checkbox, edit it from the actions
menu, or delete it. Deleting asks for confirmation and removes the task's
completion history too.

**Today-first behavior.** Repeating tasks reset visually each day. A task
completed today appears done today but returns to your active list tomorrow.
One-off tasks keep their completed state.

**Quick add.** Press `Shift + A` anywhere on the Tasks page (outside a text
field) to open the new-task dialog. The Add task button also shows the
shortcut on larger screens.

**Friendly feedback.** Adding, completing, updating, and deleting a task all
produce a short confirmation toast. Completing a task celebrates with a small
message.

**Empty and loading states.** The list shows a clear empty state with a
call-to-action, and a skeleton screen while your data loads.

### Streaks

The Streaks page makes consistency visible.

**Daily streak.** Your overall streak counts any day where you saved a
check-in, added a task, or completed one. A prominent card shows the current
count with an animated flame.

**Streak status card.** Tells you whether today's check-in is saved, whether
your streak is already safe, or what you can do to keep it moving. Shortcuts
take you to Days or Tasks.

**Overview stats.** Four compact cards show:

- Number of habit tasks with streak tracking enabled
- Your best streak
- Days active this week (out of 7)
- Total recorded completions

**Streak calendar.** A Monday-first month calendar highlights every active day.
Today is marked with a ring, and a legend explains the highlight color.

**Task streaks.** Every task with streak tracking shows its current and best
streak. If no task is tracked, the page links you to set one up.

**30-day trend chart.** A line chart plots completions and created tasks so you
can see whether you are finishing more than you are adding.

### Days and mood check-ins

The Days page is a lightweight daily journal.

**Mood check-in.** Pick one of five moods:

| Mood | Label |
| --- | --- |
| 😡 | Awful |
| 😕 | Bad |
| 😐 | Okay |
| 🙂 | Good |
| 😄 | Great |

Add optional notes and rate the day with **Up** or **Down**. A check-in can be
saved once and updated later on the same day.

**Unsaved-edit protection.** Changes stay in a draft until you press Save.
Resetting discards only the draft and never deletes a saved check-in, with a
confirmation dialog to prevent accidents.

**This month summary.** Shows the mood distribution as percentages, your
average mood, and counts of up and down days.

**Mood over time.** An area chart plots every saved mood, while a bar chart
shows how often each emoji was used.

**Recent check-ins.** The six most recent entries show the mood emoji, date,
time, note, and up/down rating.

**Streak connection.** A saved check-in counts toward your daily streak.

### Friends

Friends makes progress social without turning it into a competition you did
not ask for.

- **Your circle.** See accepted friends with their display name, username, bio,
  current streak, and best streak.
- **Add friends.** Open a dialog with suggested people you may know.
- **Search.** Search by name or username with debounced results.
- **Friend requests.** Send, accept, decline, cancel, and remove friends.
  Incoming and sent requests are grouped separately.
- **Public profiles.** Friends see a display name, username, bio, and streak
  stats. Private email addresses are never exposed, and there are no demo
  accounts — every friend is a real registered user.
- **Multiple entry points.** The header offers Add friends and Leaderboard
  buttons, and a Challenges card links to community goals.
- **Deep link support.** Opening `/friends#friend-requests` from a notification
  automatically opens the requests dialog.

### Challenges

Challenges are shared 21-, 30-, 75-, or 100-day commitments organized by
category.

**Categories and icons**

| Category | Icon theme | Examples |
| --- | --- | --- |
| Fitness | Dumbbell, green | 75 Hard, 10K steps daily, Morning workout, No sugar |
| Mind | Brain, violet | Meditation 10 min daily, Journaling every day, Read 20 pages daily |
| Discipline | Shield, amber | No smoking, No alcohol, No vaping, Cold showers, Wake up at 5 AM |
| Productivity | Briefcase, sky | 100 Days of Code, Deep work 2 hours daily, Inbox zero |
| Money | Piggy bank, blue | No-spend month, Save a fixed amount daily, Track every expense |

**How it works**

- Browse challenges and filter by category (All, Fitness, Mind, Discipline,
  Productivity, Money).
- Each card shows the category, target length, description, and the number of
  participants.
- Joining a challenge adds its daily task to your Tasks page, so progress is
  tracked where you already work.
- Only participant totals are shared publicly — never personal check-in data.
- Share a challenge using the native share sheet when available, or copy a
  direct link to that challenge card.
- A joined counter at the top of the page shows how many challenges you are
  part of.

### Friends leaderboard

A friends-only scoreboard for the last 30 days.

**Your score** is shown out of 100 and is built from three weighted rates:

```
Score = 100 × (0.5 × completion + 0.3 × consistency + 0.2 × on-time)
```

| Metric | Weight | Meaning |
| --- | --- | --- |
| Completion rate | 50% | Completed task occurrences divided by task occurrences due |
| Consistency rate | 30% | Days you completed a task divided by days with tasks due |
| On-time rate | 20% | Tasks with due dates completed on or before the due date |

The page explains each metric with a progress bar and your own percentage. It
also shows your rank, the full ranked list of you and your friends, avatars,
and a refresh button. Ties are broken alphabetically, and users without a
score yet appear at the end.

### Notifications

A single place for social updates.

- Friend request received
- Friend request accepted
- Friend request declined
- Unread count badge and highlighted unread rows
- Mark one notification as read, or mark all as read
- Delete individual notifications
- **View request** shortcut that deep-links to the Friends requests dialog
- Automatically refreshes when the window regains focus or becomes visible,
  and every 30 seconds while the page is open
- Clear empty state when you are all caught up

### Profile

Your personal dashboard and identity.

**Profile card.** Avatar with initials, name, email, member-since date, and
current streak. Edit your name and bio from a dialog.

**Activity stats.** Task completions, current streak, days logged, and today's
completion percentage, each with a short explanation.

**Shortcuts.** Quick links to Analytics, Settings, Streaks, Days, and Tasks,
plus Help & support and Log out.

**Achievements.** Six badges with locked/unlocked states and an eye toggle that
reveals how to unlock each one:

| Achievement | Unlock condition |
| --- | --- |
| First steps | Create your first task |
| On fire | Reach a 7-day activity streak |
| Early bird | Complete a task scheduled before 8:00 AM |
| Journaler | Save a daily check-in |
| Unstoppable | Reach a 30-day best streak |
| Centurion | Record 100 task completions |

**Log out.** Confirmation dialog before signing out.

### Analytics

A deeper look at your last 7, 14, or 30 days, selectable from a range menu.

**KPI cards**

- Tasks completed in the selected range
- Current completion rate for today
- Completed focus time based on task durations
- Best current streak across tracked tasks

**Charts**

- **Task activity** — an area chart comparing tasks completed with tasks
  created.
- **Completions by category** — a donut chart across Work, Personal, Health,
  Learning, Finance, and Challenge.
- **Mood check-ins** — a line chart of saved moods from 1 to 5.
- **Up / down days** — a separate daily graph showing which check-ins were
  rated up or down.
- **Completed focus time by hour** — a bar chart of scheduled focus minutes.
- **Weekly comparison** — this week versus last week, day by day.

Every chart has a helpful empty state when there is not enough data yet.

### Settings

Account and preference controls in one place.

- **Profile** — edit name and bio; email is read-only and managed by your
  sign-in provider.
- **Password & security** — change your password with confirmation and a
  minimum length check.
- **Appearance** — choose Light, Dark, or System theme. The current theme is
  shown as a badge.
- **Notifications** — preference switches for a daily reminder (with a time),
  streak alerts, weekly summary, and product updates.
- **Data & privacy** — clear all app data with a typed `DELETE` confirmation.
  This removes tasks, completion history, check-ins, friend connections, and
  notifications while keeping your account and profile. A success animation
  confirms completion, and errors are reported with a retry path.

### Help and support

- Four expandable FAQs covering tasks, streaks, analytics, and profile
  preferences.
- Quick links to Tasks, Streaks, Analytics, and Settings.
- Consistent back navigation to the profile.

### Accounts and authentication

- **Register** with name, email, and password (minimum 6 characters). If email
  verification is required, a dialog confirms where the verification link was
  sent and lets you go back to correct your details.
- **Log in** with email and password, with a link to password recovery.
- **Forgot password** sends a reset link and confirms that a link was sent
  without revealing whether an account exists.
- **Reset password** verifies the reset link, checks session state, and lets
  you set a new password with confirmation. Expired or invalid links get a
  clear recovery path.
- **Session protection.** Private routes require a valid session. A client-side
  guard mirrors the server check during hydration and navigation.
- **Clear configuration errors.** If the app's backend connection is not
  configured, the auth screens explain what is missing instead of failing
  silently.

---

## Theme and visual design

### Theme modes

Taskflow supports three appearance modes, available from the header toggle and
Settings:

- **Light** — white background, near-black text, soft gray surfaces.
- **Dark** — deep neutral background with lighter cards and reduced-contrast
  borders.
- **System** — follows your operating system preference and updates with it.

The theme is applied at the document root, transitions are disabled during the
switch to avoid flicker, and the header toggle switches directly between light
and dark.

### Color palette

| Role | Light | Dark |
| --- | --- | --- |
| Primary / accent | `#0057FF` (vivid blue) | `#0057FF` |
| Primary text | `#FFFFFF` | `#FFFFFF` |
| Focus ring | `#0057FF` | `#78A5FF` |
| Background | White | Deep neutral |
| Card | White | Elevated neutral |

Charts use a five-step blue scale from deep `#003CA8` through `#0057FF` to
light `#C4D7FF`, keeping every visualization on-brand.

Category accents add context without breaking the palette: emerald for
Fitness, violet for Mind, amber for Discipline, sky for Productivity, and blue
for Money. Success states use emerald, while destructive actions use red.

### Typography

- **Space Grotesk** is the primary typeface for body text, headings, numbers,
  and buttons. It gives the app a friendly, slightly technical character.
- **Geist Mono** is available for monospaced details such as the leaderboard
  scoring formula.
- Headings use tight tracking and semibold weights; large hero text uses
  balanced line wrapping.
- Numeric values use tabular figures so stats and charts align cleanly.

### Shape and spacing

- A base radius of `0.625rem` scales up through small, medium, large, extra
  large, 2xl, 3xl, and 4xl tokens.
- Cards, dialogs, and panels use generous rounding; the profile avatar and
  challenge icons use 2xl corners.
- Compact spacing on mobile expands at `sm` and `md` breakpoints.
- Cards reduce their internal spacing on small screens, and chart axis labels
  shrink to fit.

### Surfaces and depth

- Soft borders define most surfaces, with subtle shadows on floating elements.
- The top bar, bottom navigation, and landing header use translucent
  backgrounds with blur for a layered feel.
- Primary actions carry a faint blue shadow, and the profile header uses a
  solid primary background with white text.
- Hover states gently tint borders or backgrounds toward the primary color.

### Iconography

A consistent line icon set is used throughout: check marks for completion,
flames for streaks, smiling faces for moods, bells for notifications, users for
friends, trophies for challenges and leaderboards, and chart icons for
analytics. Icons are decorative where appropriate and labeled where interactive.

---

## Layout and navigation

**Top bar.** Always visible and sticky. It contains the Taskflow logo, the
current page title, a theme toggle, a notifications shortcut, and your avatar
menu. On mobile, the title stays compact and the avatar hides your name.

**Floating bottom navigation.** Four primary destinations — Tasks, Streaks,
Days, and Friends — sit in a centered, rounded, blurred bar. It floats above
the content on mobile and desktop alike, respecting safe-area insets on phones.
The active item gets a spring-animated pill and a primary-colored icon and
label.

**Content width.** Private pages use a centered container up to 5xl, with
narrower layouts for Friends, Notifications, Leaderboard, Settings, and Help.
Content leaves room at the bottom for the floating navigation.

**Responsive behavior.** Layouts collapse from multi-column grids to single
columns on phones. The Friends header stacks its buttons, chart legends wrap,
and the challenge grid moves from one to two to three columns. A mobile hook
tracks viewport changes for layout-dependent behavior.

**Auth screens.** Login, register, forgot password, and reset password share a
split-screen layout: the form on the left and a decorative panel on the right
with floating cards about routines and moods. The decorative panel hides on
small screens.

**Landing page.** A sticky header with Login and Register, a hero with a
product preview card, a six-feature grid, a closing call-to-action, and a
simple footer.

---

## Motion and feedback

- **Page transitions.** Route changes fade the page content in and out.
- **Entrance animations.** Cards, lists, and page sections fade and slide into
  place with staggered delays. Shared easing keeps motion consistent.
- **Scroll reveals.** Landing-page sections animate once as they enter the
  viewport.
- **Micro-interactions.** The bottom-nav active pill uses a spring layout
  animation; buttons and links scale slightly on hover and press; mood emoji
  buttons spring when selected.
- **Animated flame.** The streak flame gently bounces and glows. It respects
  `prefers-reduced-motion` and becomes static when motion is reduced.
- **Success and error feedback.** Toasts confirm saves, completions, friend
  actions, challenge joins, and preference changes. Destructive actions use
  confirmation dialogs with clear consequences.
- **Loading states.** Skeleton screens match the shape of the content for
  tasks, streaks, analytics, friends, challenges, notifications, and session
  verification. Inline skeletons cover search results and suggestions.
- **Empty states.** Every major page has a friendly empty state that explains
  what to do next rather than showing a blank screen.
- **Reduced motion.** The streak animation is disabled for users who prefer
  reduced motion, and the app avoids layout-shifting transitions during theme
  changes.

---

## Accessibility

- Semantic headings, lists, sections, and navigation landmarks.
- Visible focus rings on interactive elements, using the primary color.
- `aria-current` on the active navigation item and `aria-pressed` on toggles,
  filters, and mood selections.
- `aria-label` on icon-only buttons such as theme toggle, notifications,
  profile actions, and friend request controls.
- Live-region style status text for loading skeletons and destructive
  operations.
- Confirmation dialogs before deleting tasks, removing friends, resetting a
  draft, logging out, or clearing data.
- Forms use associated labels, sensible autocomplete hints, and inline error
  messages with `role="alert"`.
- Keyboard support: Enter advances through task form fields and submits at the
  end; `Shift + A` opens the new-task dialog.
- Charts and metrics include text alternatives and accessible labels where
  meaningful.
- Respect for reduced-motion preferences.

---

## Data and privacy

- Every task, completion, check-in, friendship, challenge participation, and
  notification belongs to your account and is protected per user.
- Friends see only your display name, username, bio, and streak statistics.
  Your email address is never shared with friends.
- Challenge participation exposes only your membership, never your private
  check-in details.
- There are no demo or fake friend accounts.
- **Clear all data** permanently removes your activity while keeping your
  account and profile, and requires typing `DELETE` to confirm.
- Sessions are verified before private pages render, and signed-out visitors
  are redirected to login.
- The app explains missing or unavailable storage with plain-language messages
  instead of raw errors.

---

## Current limitations and coming soon

- **Accent color customization** is shown in Settings as a preview marked
  "Coming soon"; the primary blue is fixed for now.
- **Reminder and notification preferences** can be configured on the Settings
  page, but are not yet delivered as push or email notifications.
- **Challenge progress** is tracked through the daily task created when you
  join a challenge; there is no separate challenge check-in screen.
- **Leaderboard scoring** uses a rolling 30-day window and only includes you
  and your accepted friends who have a score.
- **Achievements** are evaluated from your activity and are not shareable
  badges.
- **Social features** cover friend requests, profiles, notifications, a
  leaderboard, and challenges — there is no direct messaging or activity feed.
