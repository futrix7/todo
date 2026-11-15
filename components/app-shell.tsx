"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Check,
  Bell,
  ChevronRight,
  CalendarDays,
  BriefcaseBusiness,
  BookOpen,
  BookMarked,
  Bug,
  Cake,
  Calculator,
  Camera,
  CarFront,
  ChartColumn,
  ChartPie,
  ChefHat,
  Church,
  CircleDollarSign,
  ClipboardList,
  Cloud,
  Code2,
  Coffee,
  Compass,
  CookingPot,
  CreditCard,
  Dog,
  Dumbbell,
  Earth,
  File,
  Film,
  Flag,
  FlaskConical,
  Flower2,
  Folder,
  FolderPlus,
  Pencil,
  Flame,
  Gamepad2,
  Gift,
  GraduationCap,
  Hammer,
  HandHeart,
  Headphones,
  Heart,
  House,
  Inbox,
  Layers,
  Laptop,
  Leaf,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  Map,
  MapPin,
  Medal,
  Megaphone,
  MessageCircle,
  Mic,
  Monitor,
  Mountain,
  Music2,
  Moon,
  NotebookPen,
  Package,
  Palette,
  PawPrint,
  Phone,
  Plane,
  PlugZap,
  Puzzle,
  Plus,
  Rocket,
  School,
  Scissors,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShowerHead,
  Smartphone,
  Soup,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Target,
  Theater,
  Ticket,
  Timer,
  TrainFront,
  Trees,
  Truck,
  Umbrella,
  Utensils,
  Video,
  Wallet,
  Watch,
  Wrench,
  Zap,
  Smile,
  Sun,
  Trophy,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSupabaseDataStatus } from "@/components/supabase-data-provider";
import {
  isSupabaseConfigured,
  loadTaskGroups,
  saveTaskGroup,
  updateTaskGroup,
} from "@/lib/supabase/task-data";
import { loadUnreadNotificationCount } from "@/lib/supabase/social-data";
import type { TaskGroup } from "@/lib/types";
import { useMounted } from "@/lib/use-local-storage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { DailyCheckinReminder } from "@/components/daily-checkin-reminder";

const NAV_ITEMS = [
  {
    href: "/tasks",
    label: "Tasks",
    description: "Plan and organize your tasks",
    icon: ListChecks,
  },
  {
    href: "/habits",
    label: "Habits",
    description: "Build and track recurring habits",
    icon: Sprout,
  },
  {
    href: "/streak",
    label: "Streaks",
    description: "See your daily progress",
    icon: Flame,
  },
  {
    href: "/days",
    label: "Days",
    description: "Review your daily check-ins",
    icon: Smile,
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "See tasks by date",
    icon: CalendarDays,
  },
  {
    href: "/profile/analytics",
    label: "Analytics",
    description: "Review your task trends and insights",
    icon: ChartColumn,
  },
  {
    href: "/friends",
    label: "Friends",
    description: "Connect and take on challenges",
    icon: UsersRound,
  },
  {
    href: "/friends/leaderboard",
    label: "Leaderboard",
    description: "Compare progress with friends",
    icon: Medal,
  },
  {
    href: "/friends/challenges",
    label: "Challenges",
    description: "Join community challenges",
    icon: Trophy,
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/friends") return pathname === "/friends";
  if (href === "/profile") {
    return pathname === "/profile" || pathname.startsWith("/profile/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-xl"
            aria-label="Toggle theme"
            onClick={() => setTheme(dark ? "light" : "dark")}
          />
        }
      >
        {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </TooltipTrigger>
      <TooltipContent side="right">Toggle theme</TooltipContent>
    </Tooltip>
  );
}

const TASK_GROUP_ICONS = {
  file: File,
  folder: Folder,
  home: House,
  work: BriefcaseBusiness,
  book: BookOpen,
  fitness: Dumbbell,
  heart: Heart,
  target: Target,
  bookmarked: BookMarked,
  bug: Bug,
  cake: Cake,
  calculator: Calculator,
  camera: Camera,
  car: CarFront,
  chart: ChartColumn,
  chart_pie: ChartPie,
  chef: ChefHat,
  church: Church,
  money: CircleDollarSign,
  clipboard: ClipboardList,
  cloud: Cloud,
  code: Code2,
  coffee: Coffee,
  compass: Compass,
  cooking: CookingPot,
  credit_card: CreditCard,
  dog: Dog,
  earth: Earth,
  film: Film,
  flag: Flag,
  flask: FlaskConical,
  flower: Flower2,
  gamepad: Gamepad2,
  gift: Gift,
  graduation: GraduationCap,
  hammer: Hammer,
  hand_heart: HandHeart,
  headphones: Headphones,
  laptop: Laptop,
  leaf: Leaf,
  idea: Lightbulb,
  lock: LockKeyhole,
  map: Map,
  pin: MapPin,
  medal: Medal,
  megaphone: Megaphone,
  message: MessageCircle,
  mic: Mic,
  monitor: Monitor,
  mountain: Mountain,
  music: Music2,
  notebook: NotebookPen,
  package: Package,
  palette: Palette,
  paw: PawPrint,
  phone: Phone,
  plane: Plane,
  plug: PlugZap,
  puzzle: Puzzle,
  rocket: Rocket,
  school: School,
  scissors: Scissors,
  settings: Settings2,
  shield: ShieldCheck,
  shopping: ShoppingBag,
  shower: ShowerHead,
  smartphone: Smartphone,
  soup: Soup,
  sparkles: Sparkles,
  sprout: Sprout,
  star: Star,
  medical: Stethoscope,
  theater: Theater,
  ticket: Ticket,
  timer: Timer,
  train: TrainFront,
  trees: Trees,
  truck: Truck,
  umbrella: Umbrella,
  utensils: Utensils,
  video: Video,
  wallet: Wallet,
  watch: Watch,
  wrench: Wrench,
  zap: Zap,
  trophy: Trophy,
} as const;

function TaskGroupSidebar({ pathname }: { pathname: string }) {
  const { user } = useAuth();
  const { reportError, schemaUnavailable } = useSupabaseDataStatus();
  const [groups, setGroups] = React.useState<TaskGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = React.useState(true);
  const [activeGroup, setActiveGroup] = React.useState("all");
  const [width, setWidth] = React.useState(248);
  const [resizing, setResizing] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<TaskGroup | null>(null);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newGroupIcon, setNewGroupIcon] = React.useState<keyof typeof TASK_GROUP_ICONS>("file");
  const [savingGroup, setSavingGroup] = React.useState(false);
  const sidebarErrorId = React.useId();
  const sidebarRef = React.useRef<HTMLElement>(null);

  function getMaxWidth() {
    const shellWidth = sidebarRef.current?.parentElement?.clientWidth ?? 1048;
    return Math.max(200, Math.min(400, shellWidth - 48 - 600));
  }

  function resize(event: React.PointerEvent<HTMLDivElement>) {
    if (!resizing) return;
    const left = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
    setWidth(Math.min(getMaxWidth(), Math.max(200, event.clientX - left)));
  }

  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
    const left = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
    setWidth(Math.min(getMaxWidth(), Math.max(200, event.clientX - left)));
  }

  function endResize(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setResizing(false);
  }

  function resetGroupForm() {
    setNewGroupName("");
    setNewGroupIcon("file");
    setEditingGroup(null);
  }

  function openCreateGroup() {
    resetGroupForm();
    setCreateOpen(true);
  }

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    if (name.length > 60) {
      toast.error("Group names can be up to 60 characters.");
      return;
    }
    if (!user?.id) {
      toast.error("Sign in to create a task group.");
      return;
    }

    setSavingGroup(true);
    try {
      const group = editingGroup
        ? await updateTaskGroup(
            user.id,
            editingGroup.id,
            name,
            newGroupIcon
          )
        : await saveTaskGroup(user.id, name, newGroupIcon);
      setGroups((current) =>
        [...current.filter((item) => item.id !== group.id), group].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      window.dispatchEvent(
        new CustomEvent("task-group-updated", { detail: group })
      );
      const wasEditing = Boolean(editingGroup);
      resetGroupForm();
      setCreateOpen(false);
      if (!wasEditing) {
        window.location.hash = `group=${encodeURIComponent(group.id)}`;
        window.dispatchEvent(
          new CustomEvent("task-group-created", { detail: group })
        );
        toast.success(`“${group.name}” group created.`);
      } else {
        window.dispatchEvent(new Event("task-groups-updated"));
        toast.success(`“${group.name}” group updated.`);
      }
    } catch (error) {
      reportError(error);
    } finally {
      setSavingGroup(false);
    }
  }

  React.useEffect(() => {
    let active = true;
    function refreshGroups() {
      if (!user?.id || !isSupabaseConfigured || schemaUnavailable) {
        setGroupsLoading(false);
        return;
      }

      loadTaskGroups(user.id)
        .then((loadedGroups) => {
          if (active) setGroups(loadedGroups);
        })
        .catch(reportError)
        .finally(() => {
          if (active) setGroupsLoading(false);
        });
    }

    refreshGroups();
    window.addEventListener("task-groups-updated", refreshGroups);
    return () => {
      active = false;
      window.removeEventListener("task-groups-updated", refreshGroups);
    };
  }, [reportError, schemaUnavailable, user]);

  React.useEffect(() => {
    function handleCreateRequest() {
      setNewGroupName("");
      setNewGroupIcon("file");
      setEditingGroup(null);
      setCreateOpen(true);
    }

    function handleEditRequest(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      const group = event.detail as TaskGroup | undefined;
      if (!group?.id || typeof group.name !== "string") return;
      setEditingGroup(group);
      setNewGroupName(group.name);
      setNewGroupIcon(
        group.icon && group.icon in TASK_GROUP_ICONS
          ? (group.icon as keyof typeof TASK_GROUP_ICONS)
          : "file"
      );
      setCreateOpen(true);
    }

    window.addEventListener("task-group-create-requested", handleCreateRequest);
    window.addEventListener("task-group-edit-requested", handleEditRequest);
    return () => {
      window.removeEventListener("task-group-create-requested", handleCreateRequest);
      window.removeEventListener("task-group-edit-requested", handleEditRequest);
    };
  }, []);

  React.useEffect(() => {
    function syncActiveGroup() {
      const group = new URLSearchParams(window.location.hash.slice(1)).get("group");
      setActiveGroup(group ?? "all");
    }

    syncActiveGroup();
    window.addEventListener("hashchange", syncActiveGroup);
    window.addEventListener("popstate", syncActiveGroup);
    return () => {
      window.removeEventListener("hashchange", syncActiveGroup);
      window.removeEventListener("popstate", syncActiveGroup);
    };
  }, [pathname]);

  const links = [
    { id: "all", label: "All tasks", icon: Layers },
    { id: "ungrouped", label: "Ungrouped", icon: Inbox },
    { id: "challenges", label: "Challenges", icon: Trophy },
    ...groups.map((group) => {
      const icon = TASK_GROUP_ICONS[group.icon as keyof typeof TASK_GROUP_ICONS] ?? File;
      return { id: group.id, label: group.name, icon };
    }),
  ];

  const isMobile = useIsMobile();
  const groupEditorTitle = editingGroup
    ? "Edit task group"
    : "Create a task group";
  const groupEditorDescription = editingGroup
    ? "Update the name or icon used to organize this group."
    : "Give related tasks a home. Choose a name and an icon.";
  const groupEditorFields = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-group-name">Group name</Label>
        <Input
          id="task-group-name"
          value={newGroupName}
          onChange={(event) => setNewGroupName(event.target.value)}
          placeholder="e.g. Personal projects"
          aria-describedby={sidebarErrorId}
          maxLength={60}
          autoComplete="off"
          autoFocus
          required
        />
      </div>
      <fieldset className="flex min-h-0 flex-col gap-2">
        <legend className="text-sm font-medium">Choose an icon</legend>
        <div
          className="group-icon-scroll-region grid max-h-44 grid-cols-6 gap-1 overflow-y-auto overscroll-contain rounded-lg border p-2 sm:grid-cols-8"
          role="radiogroup"
          aria-label="Choose a group icon"
        >
          {Object.entries(TASK_GROUP_ICONS).map(([id, Icon]) => (
            <Button
              key={id}
              type="button"
              variant={newGroupIcon === id ? "secondary" : "ghost"}
              className={cn(
                "size-10 p-0",
                newGroupIcon === id && "ring-2 ring-primary/40"
              )}
              aria-label={`${id.replaceAll("_", " ")} icon`}
              role="radio"
              aria-checked={newGroupIcon === id}
              onClick={() => setNewGroupIcon(id as keyof typeof TASK_GROUP_ICONS)}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>
      </fieldset>
      <p id={sidebarErrorId} className="sr-only">
        Group names must be unique and no longer than 60 characters.
      </p>
    </div>
  );
  const groupEditorActions = (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={savingGroup}
        onClick={() => setCreateOpen(false)}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={savingGroup}>
        {editingGroup ? <Pencil /> : <FolderPlus />}
        {savingGroup
          ? editingGroup
            ? "Saving…"
            : "Creating…"
          : editingGroup
            ? "Save changes"
            : "Create group"}
      </Button>
    </>
  );
  const handleGroupEditorOpenChange = (open: boolean) => {
    if (savingGroup) return;
    setCreateOpen(open);
    if (!open) resetGroupForm();
  };

  return (
    <aside
      ref={sidebarRef}
      className="relative w-full shrink-0 border-b bg-sidebar/40 px-2 pt-2 pb-0 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:max-h-dvh lg:w-[var(--task-groups-width)] lg:basis-[var(--task-groups-width)] lg:flex-col lg:overflow-hidden lg:border-b-0 lg:border-r lg:bg-sidebar lg:px-3 lg:py-4"
      style={{ "--task-groups-width": `${width}px` } as React.CSSProperties}
    >
      <div className="mb-2 flex min-h-9 w-full shrink-0 items-center gap-2 px-1.5 lg:hidden">
        <Link
          href="/tasks"
          aria-label="Taskflow — tasks"
          className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <span className="truncate font-heading text-sm font-semibold">
            Taskflow
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bell className="size-4" />
          </Link>
          <Link
            href="/profile"
            aria-label="Profile"
            className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar size="sm">
              <AvatarFallback>{initials(user?.name ?? "U")}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
      <nav
        id="task-group-links"
        aria-label="Task groups"
        className="sidebar-scroll-region flex gap-1 overflow-x-auto lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain"
      >
          {links.map((link) => {
            const Icon = link.icon;
            const href = `/tasks#group=${encodeURIComponent(link.id)}`;
            const active = activeGroup === link.id;

            return (
              <Link
                key={link.id}
                href={href}
                onClick={(event) => {
                  if (
                    event.defaultPrevented ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  ) {
                    return;
                  }
                  setActiveGroup(link.id);
                  window.dispatchEvent(
                    new CustomEvent("task-group-selected", {
                      detail: link.id,
                    })
                  );
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-9 shrink-0 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-10 lg:w-full",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{link.label}</span>
                <ChevronRight className="ml-auto hidden size-3 opacity-50 lg:block" />
              </Link>
            );
          })}
          {groupsLoading &&
            Array.from({ length: 3 }, (_, index) => (
              <div
                key={`group-skeleton-${index}`}
                className="flex min-h-10 shrink-0 items-center gap-2.5 rounded-md px-3 lg:w-full"
                aria-hidden="true"
              >
                <Skeleton className="size-4 shrink-0 rounded-sm" />
                <Skeleton className="h-3.5 min-w-0 flex-1" />
              </div>
            ))}
      </nav>
      <Button
        type="button"
        variant="ghost"
        aria-haspopup="dialog"
        disabled={savingGroup}
        onClick={openCreateGroup}
        className="mt-2 hidden min-h-10 w-full shrink-0 justify-start gap-2.5 rounded-md px-3 text-sm font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:flex"
      >
        <Plus className="size-3.5 shrink-0" />
        Create a group
      </Button>
      {isMobile ? (
        <Drawer
          open={createOpen}
          onOpenChange={handleGroupEditorOpenChange}
          swipeDirection="down"
        >
          <DrawerContent className="max-h-[min(90dvh,46rem)]">
            <DrawerHeader>
              <DrawerTitle>{groupEditorTitle}</DrawerTitle>
              <DrawerDescription>{groupEditorDescription}</DrawerDescription>
            </DrawerHeader>
            <form
              onSubmit={createGroup}
              autoComplete="off"
              className="flex min-h-0 flex-1 flex-col"
            >
              {groupEditorFields}
              <DrawerFooter>{groupEditorActions}</DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={createOpen} onOpenChange={handleGroupEditorOpenChange}>
          <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-lg">
            <DialogHeader className="px-5 pb-4 pt-5">
              <DialogTitle>{groupEditorTitle}</DialogTitle>
              <DialogDescription>{groupEditorDescription}</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={createGroup}
              autoComplete="off"
              className="flex min-h-0 flex-1 flex-col"
            >
              {groupEditorFields}
              <DialogFooter className="px-5 pt-3 pb-5">
                {groupEditorActions}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      <div
        role="separator"
        aria-label="Resize task groups sidebar"
        aria-orientation="vertical"
        aria-valuenow={width}
        aria-valuemin={200}
        aria-valuemax={400}
        tabIndex={0}
        onPointerDown={startResize}
        onPointerMove={resize}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const maxWidth = getMaxWidth();
            setWidth((current) =>
              Math.min(
                maxWidth,
                Math.max(200, current + (event.key === "ArrowRight" ? 16 : -16))
              )
            );
          }
        }}
        className="absolute inset-y-0 -right-1 z-20 hidden w-2 cursor-col-resize touch-none bg-transparent outline-none hover:bg-foreground/10 focus-visible:bg-foreground/15 lg:block"
      />
    </aside>
  );
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  const { user } = useAuth();
  const { reportError } = useSupabaseDataStatus();
  const [unreadNotificationState, setUnreadNotificationState] =
    React.useState<{ userId: string; count: number } | null>(null);
  const unreadNotificationCount =
    unreadNotificationState && unreadNotificationState.userId === user?.id
      ? unreadNotificationState.count
      : 0;

  React.useEffect(() => {
    if (!user?.id) return;
    if (!isSupabaseConfigured) return;

    let active = true;
    let errorReported = false;
    let updateVersion = 0;
    const refreshCount = async () => {
      const requestVersion = updateVersion;
      try {
        const count = await loadUnreadNotificationCount(user.id);
        if (!active || requestVersion !== updateVersion) return;
        errorReported = false;
        setUnreadNotificationState({ userId: user.id, count });
      } catch (error) {
        if (active && requestVersion === updateVersion && !errorReported) {
          errorReported = true;
          reportError(error);
        }
      }
    };
    const handleCountUpdate = (event: Event) => {
      if (
        event instanceof CustomEvent &&
        typeof event.detail === "number" &&
        Number.isInteger(event.detail) &&
        event.detail >= 0
      ) {
        updateVersion += 1;
        setUnreadNotificationState({ userId: user.id, count: event.detail });
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshCount();
    };

    void refreshCount();
    window.addEventListener(
      "taskflow:unread-notifications-changed",
      handleCountUpdate
    );
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const refreshTimer = window.setInterval(refreshWhenVisible, 30_000);
    return () => {
      active = false;
      window.removeEventListener(
        "taskflow:unread-notifications-changed",
        handleCountUpdate
      );
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(refreshTimer);
    };
  }, [reportError, user?.id]);

  return (
    <aside className="sticky top-0 hidden h-dvh max-h-dvh w-14 shrink-0 flex-col items-center overflow-hidden border-r bg-sidebar py-3 text-sidebar-foreground md:flex lg:w-16">
      <div className="flex shrink-0 flex-col items-center">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/tasks"
                aria-label="Taskflow — tasks"
                className="mb-5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <Check className="size-5 shrink-0" strokeWidth={3} />
          </TooltipTrigger>
          <TooltipContent side="right">Taskflow</TooltipContent>
        </Tooltip>
      </div>

      <nav
        aria-label="Primary"
        className="sidebar-scroll-region flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto overscroll-contain py-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger
                render={
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  />
                }
              >
                <Icon className="size-[19px] shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="flex shrink-0 flex-col items-center gap-2 border-t pt-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/notifications"
                aria-label={
                  unreadNotificationCount > 0
                    ? `Notifications, ${unreadNotificationCount} unread`
                    : "Notifications"
                }
                aria-current={pathname === "/notifications" ? "page" : undefined}
                className={cn(
                  "relative flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  pathname === "/notifications" &&
                    "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              />
            }
          >
            <Bell className="size-[19px]" />
            {unreadNotificationCount > 0 && (
              <Badge
                aria-hidden="true"
                variant="destructive"
                className="absolute -right-1 -top-1 min-w-4 px-1 text-[10px] leading-none"
              >
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </Badge>
            )}
          </TooltipTrigger>
          <TooltipContent side="right">
            {unreadNotificationCount > 0
              ? `Notifications (${unreadNotificationCount} unread)`
              : "Notifications"}
          </TooltipContent>
        </Tooltip>

        <ThemeToggle />

        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/profile"
                aria-label="Profile"
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive(pathname, "/profile") && "bg-sidebar-accent"
                )}
              />
            }
          >
            <Avatar size="sm">
              <AvatarFallback>{initials(user?.name ?? "U")}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="right">{user?.name ?? "Profile"}</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTasksPage = pathname === "/tasks";
  const isCalendarPage = pathname === "/calendar";

  return (
    <div
      className={cn(
        "flex bg-background",
        !isTasksPage && "min-h-dvh",
        isTasksPage && "h-dvh min-h-0 overflow-hidden",
        isCalendarPage && "lg:h-dvh lg:min-h-0 lg:overflow-hidden"
      )}
    >
      <DesktopSidebar pathname={pathname} />
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col lg:flex-row",
          isTasksPage && "h-full min-h-0",
          isCalendarPage && "lg:h-full lg:min-h-0"
        )}
      >
        {isTasksPage && <TaskGroupSidebar pathname={pathname} />}
        <main
          className={cn(
            "min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 md:pb-8",
            !isTasksPage && "pb-24 sm:pb-24 lg:px-8 lg:py-6",
            isTasksPage &&
              "flex min-h-0 flex-col overflow-hidden px-2 pt-0 pb-[calc(4rem_+_env(safe-area-inset-bottom))] sm:px-3 sm:pb-[calc(4rem_+_env(safe-area-inset-bottom))] md:px-5 md:pb-8 lg:px-6 lg:py-5",
            isCalendarPage &&
              "p-0 pb-24 md:pb-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden"
          )}
        >
          <div
            className={cn(
              "w-full min-w-0 app-scroll-region",
              isTasksPage && "flex min-h-0 flex-1 flex-col",
              isCalendarPage && "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
            )}
          >
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav key={pathname} items={NAV_ITEMS} />
      <DailyCheckinReminder />
    </div>
  );
}

export { NAV_ITEMS };
