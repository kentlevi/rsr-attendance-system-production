import React from "react";
import { Modal } from "./Modal";
import { 
  Bell, 
  Clock, 
  User, 
  Calendar, 
  Info, 
  AlertTriangle, 
  CheckCircle2,
  Trash2,
  MoreVertical
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "info" | "warning" | "success" | "user";
  isRead: boolean;
  createdAt?: string;
  targetRole?: "admin" | "employee" | "all";
  employeeId?: string;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNotificationClick?: (notification: AppNotification) => void;
}

export function NotificationModal({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onNotificationClick
}: NotificationModalProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertTriangle className="text-amber-500" size={18} />;
      case "success": return <CheckCircle2 className="text-emerald-500" size={18} />;
      case "user": return <User className="text-blue-500" size={18} />;
      default: return <Info className="text-slate-400" size={18} />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      maxWidth="max-w-[480px]"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button 
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-slate-400 hover:text-red-500"
            leftIcon={<Trash2 size={16} />}
          >
            Clear All
          </Button>
          <Button 
            variant="primary"
            className="px-8" 
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      }
    >
      <div className="flex flex-col">
        {/* Actions Bar */}
        <div className="px-4 py-2 sm:px-6 sm:py-3 bg-slate-50/50 border-b border-border/60 flex items-center justify-between">
          <span className="text-[16px] font-medium text-slate-500 uppercase tracking-wider">
            Recent Alerts
          </span>
          <Button 
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-[#0B7A4B] hover:underline p-0 h-auto font-medium"
          >
            Mark all as read
          </Button>
        </div>

        {/* List */}
        <div className="flex flex-col">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => onNotificationClick?.(notif)}
                className={cn(
                  "px-4 py-3 sm:px-6 sm:py-5 border-b border-border/40 hover:bg-slate-50/80 transition-colors cursor-pointer relative group",
                  !notif.isRead && "bg-[#0B7A4B]/[0.02]"
                )}
              >
                {!notif.isRead && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#0B7A4B] rounded-r-full" />
                )}
                
                <div className="flex gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    notif.type === "warning" ? "bg-amber-50" : 
                    notif.type === "success" ? "bg-emerald-50" :
                    notif.type === "user" ? "bg-blue-50" : "bg-slate-50"
                  )}>
                    {getIcon(notif.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={cn(
                        "text-[16px] leading-tight mb-1 truncate",
                        notif.isRead ? "text-slate-600 font-medium" : "text-[#1a1a1a] font-bold"
                      )}>
                        {notif.title}
                      </h4>
                      <span className="text-[14px] font-medium text-slate-400 whitespace-nowrap">
                        {notif.time}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 line-clamp-2 leading-snug">
                      {notif.message}
                    </p>
                  </div>

                  <Button 
                    variant="ghost"
                    size="xs"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 transition-all h-8 w-8 min-w-0 rounded-full"
                  >
                    <MoreVertical size={16} />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center px-10">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                <Bell size={32} />
              </div>
              <h3 className="text-[20px] font-bold text-[#1a1a1a] mb-1">All caught up!</h3>
              <p className="text-[14px] text-slate-500">You don't have any notifications at the moment. We'll let you know when something happens.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
