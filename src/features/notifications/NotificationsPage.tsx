import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import type { AppNotification } from '@/types/api'
import { notificationApi } from '@/api/notificationApi'
import { toApiError } from '@/api/axiosInstance'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, Card, ErrorState, Tag } from '@/components/ui/primitives'
import { Pagination } from '@/components/ui/Table'
import { useNotificationStore } from '@/store/notificationStore'
import { humanize, relativeTime } from '@/utils/date'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const setItems = useNotificationStore((s) => s.setItems)

  const list = useApi(() => notificationApi.list({ page, size: 15, unreadOnly }), [page, unreadOnly])

  const markRead = async (n: AppNotification) => {
    try {
      await notificationApi.markRead(n.id)
      list.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    }
  }

  const markAll = async () => {
    try {
      await notificationApi.markAllRead()
      toast.success('All notifications marked as read')
      const refreshed = await notificationApi.list({ page: 0, size: 15, unreadOnly })
      setItems(refreshed.content)
      list.refetch()
    } catch (err) {
      toast.error(toApiError(err).message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Low stock, new orders, delayed orders, purchase order updates, return requests and system events."
        actions={
          <Button variant="outline" icon={<CheckCheck className="h-4 w-4" aria-hidden />} onClick={markAll}>
            Mark all as read
          </Button>
        }
      />

      <Card>
        <div className="flex items-center justify-between border-b border-hairline p-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(0) }} className="h-4 w-4 accent-black" />
            Unread only
          </label>
          <Bell className="h-4 w-4 text-shade-40" aria-hidden />
        </div>
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.refetch} />
        ) : (
          <ul className="divide-y divide-hairline">
            {list.data?.content.length === 0 && (
              <li className="px-6 py-10 text-center text-sm text-shade-50">No notifications here.</li>
            )}
            {list.data?.content.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 px-5 py-4 ${n.read ? 'opacity-60' : ''}`}>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-status-red" aria-label="Unread" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <Tag>{humanize(n.type)}</Tag>
                  </div>
                  <p className="mt-0.5 text-sm text-shade-60">{n.message}</p>
                  <p className="mt-1 text-xs text-shade-40">{relativeTime(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {n.link && (
                    <Button size="sm" variant="ghost" onClick={() => navigate(n.link!)}>
                      Open
                    </Button>
                  )}
                  {!n.read && (
                    <Button size="sm" variant="outline" onClick={() => markRead(n)}>
                      Mark read
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={list.data?.page ?? 0}
          totalPages={list.data?.totalPages ?? 1}
          totalElements={list.data?.totalElements ?? 0}
          size={list.data?.size ?? 15}
          onPageChange={setPage}
        />
      </Card>
    </div>
  )
}
