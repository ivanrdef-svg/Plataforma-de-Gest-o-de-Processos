import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pill } from "@/components/ui/pill";
import { NOTIFICATION_TONE } from "@/config/inbox-model";
import { formatDateTime } from "@/lib/runtime-store";
import {
  clearNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  useNotificationSync,
  useNotifications,
} from "@/lib/notification-store";
import { cn } from "@/lib/utils";

/** Build 015 — central de notificações in-app na barra superior. */
export function NotificationCenter() {
  useNotificationSync();
  const notifications = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative gap-1.5 text-muted-foreground"
          aria-label={
            unread > 0 ? `Notificações (${unread} não lidas)` : "Notificações"
          }
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <p className="text-sm font-medium">Notificações</p>
            <p className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} não lida(s)` : "Tudo em dia"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              disabled={unread === 0}
              onClick={markAllNotificationsRead}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Marcar lidas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={notifications.length === 0}
              onClick={clearNotifications}
              aria-label="Limpar notificações"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            Nenhuma notificação por enquanto.
          </p>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y">
              {notifications.slice(0, 20).map((n) => (
                <li key={n.id}>
                  <Link
                    to="/execucao/$instanceId"
                    params={{ instanceId: n.instanceId }}
                    search={n.taskId ? { task: n.taskId } : {}}
                    onClick={() => markNotificationRead(n.id)}
                    className={cn(
                      "block px-4 py-3 transition-colors hover:bg-muted/50",
                      !n.read && "bg-primary/[0.04]",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Pill tone={NOTIFICATION_TONE[n.type]} shape="full">
                        {n.type}
                      </Pill>
                      <span className="truncate text-xs font-medium">{n.title}</span>
                      {!n.read && (
                        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                      {n.detail}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground/80">
                      {formatDateTime(n.at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        <div className="border-t px-4 py-2.5">
          <Link
            to="/inbox"
            className="text-xs text-primary hover:underline"
          >
            Abrir Inbox
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
