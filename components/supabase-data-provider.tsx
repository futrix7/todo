"use client";

import * as React from "react";
import { CircleAlert, Database } from "lucide-react";

import {
  isMissingTaskDataSchemaError,
  isTaskDataSchemaUnavailable,
} from "@/lib/supabase/task-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SupabaseDataStatus {
  schemaUnavailable: boolean;
  reportError: (error: unknown) => void;
  reportSchemaUnavailable: () => void;
  reportConfigurationError: () => void;
}

const SupabaseDataStatusContext =
  React.createContext<SupabaseDataStatus | null>(null);

export function SupabaseDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [schemaUnavailable, setSchemaUnavailable] = React.useState(
    isTaskDataSchemaUnavailable()
  );
  const [missingSchema, setMissingSchema] = React.useState(false);
  const [configurationMissing, setConfigurationMissing] = React.useState(false);

  const reportError = React.useCallback((error: unknown) => {
    const isMissingSchema = isMissingTaskDataSchemaError(error);
    setMissingSchema(isMissingSchema);
    setConfigurationMissing(false);
    if (isMissingSchema) setSchemaUnavailable(true);
    setDialogOpen(true);
  }, []);
  const reportSchemaUnavailable = React.useCallback(() => {
    setMissingSchema(true);
    setConfigurationMissing(false);
    setSchemaUnavailable(true);
    setDialogOpen(true);
  }, []);
  const reportConfigurationError = React.useCallback(() => {
    setMissingSchema(false);
    setConfigurationMissing(true);
    setDialogOpen(true);
  }, []);

  return (
    <SupabaseDataStatusContext.Provider
      value={{
        schemaUnavailable,
        reportError,
        reportSchemaUnavailable,
        reportConfigurationError,
      }}
    >
      {children}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <span className="mb-1 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              {missingSchema || configurationMissing ? (
                <Database className="size-5" />
              ) : (
                <CircleAlert className="size-5" />
              )}
            </span>
            <DialogTitle>
              {missingSchema
                ? "Task storage is unavailable"
                : configurationMissing
                  ? "Connect your Supabase project"
                  : "Something happened"}
            </DialogTitle>
            <DialogDescription>
              {missingSchema
                ? "Taskflow couldn’t find the required database tables. Run supabase/schema.sql and supabase/challenge-seed.sql in the Supabase SQL Editor, then try again."
                : configurationMissing
                  ? "Supabase is not configured yet. Add your project URL and anon key to the environment, then restart the app."
                  : "We’re sorry for the trouble. We’ll be back in a few minutes. Please try again later."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SupabaseDataStatusContext.Provider>
  );
}

export function useSupabaseDataStatus(): SupabaseDataStatus {
  const context = React.useContext(SupabaseDataStatusContext);
  if (!context) {
    throw new Error(
      "useSupabaseDataStatus must be used inside <SupabaseDataProvider>"
    );
  }
  return context;
}
