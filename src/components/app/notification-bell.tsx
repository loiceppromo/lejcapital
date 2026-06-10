'use client';

import { useEffect, useState, useTransition } from 'react';
import { getUnreadCount, markAllNotificationsRead, getNotificationList, markRead } from '@/app/actions/notifications';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell({ enabled = false }: { enabled?: boolean }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pending, startTransition] = useTransition();
  const dbConfigured = enabled;

  useEffect(() => {
    if (!dbConfigured) return;
    let cancelled = false;

    async function load() {
      try {
        const c = await getUnreadCount();
        if (!cancelled) setCount(c);
      } catch {
        // DB not available
      }
    }

    load();
    // Poll every 30 seconds
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [dbConfigured]);

  function handleToggle() {
    if (!open) {
      // Load notifications when opening
      startTransition(async () => {
        try {
          const list = await getNotificationList(20);
          setNotifications(list as NotificationItem[]);
        } catch {
          setNotifications([]);
        }
      });
    }
    setOpen(!open);
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('notificationId', id);
      await markRead(fd);
      setCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    });
  }

  if (!dbConfigured) return null;

  const typeColors: Record<string, string> = {
    CYCLE_TRANSITION: 'bg-blue-100 text-blue-700',
    PCR_BREACH: 'bg-red-100 text-red-700',
    PCR_WATCH: 'bg-amber-100 text-amber-700',
    LOAN_DEFAULT: 'bg-red-100 text-red-700',
    WATERFALL_RUN: 'bg-emerald-100 text-emerald-700',
    INVESTOR_REPAYMENT: 'bg-purple-100 text-purple-700',
    SYSTEM_ALERT: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative rounded-md border border-brand-line bg-white p-1.5 text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-brand-line bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-brand-line px-4 py-3">
              <h3 className="text-sm font-semibold text-brand-black">Notifications</h3>
              {count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={pending}
                  className="text-xs font-medium text-brand-navy hover:underline disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-brand-muted">
                  {pending ? 'Loading...' : 'No notifications'}
                </p>
              )}

              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-brand-line px-4 py-3 transition-colors ${
                    n.read ? 'bg-white' : 'bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeColors[n.type] ?? 'bg-gray-100 text-gray-700'}`}>
                          {n.type.replaceAll('_', ' ')}
                        </span>
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-brand-black">{n.title}</p>
                      <p className="mt-0.5 text-xs text-brand-muted">{n.body}</p>
                      <p className="mt-1 text-[10px] text-brand-muted">
                        {new Date(n.createdAt).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        disabled={pending}
                        className="mt-1 rounded px-2 py-1 text-[10px] text-brand-muted hover:bg-brand-surface hover:text-brand-black disabled:opacity-50"
                      >
                        Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
