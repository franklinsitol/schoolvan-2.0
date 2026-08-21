import React, { useState, useEffect, useMemo } from 'react';
import { 
  AppNotification, 
  getStoredNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification, 
  clearAllNotifications, 
  subscribeNotificationStore 
} from '../lib/notificationStore';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  Trash2, 
  X, 
  Bus, 
  Wallet, 
  AlertTriangle, 
  Info, 
  Clock, 
  ArrowRight,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onNavigateTab?: (tab: 'routes' | 'finance' | 'students' | 'dashboard') => void;
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) {
      return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recente';
  }
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  onNavigateTab
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getStoredNotifications(userEmail));
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'boarding' | 'payment' | 'incident'>('all');

  useEffect(() => {
    setNotifications(getStoredNotifications(userEmail));
    const unsub = subscribeNotificationStore((list) => {
      if (userEmail) {
        const clean = userEmail.trim().toLowerCase();
        setNotifications(list.filter(n => !n.targetUserEmail || n.targetUserEmail.trim().toLowerCase() === clean));
      } else {
        setNotifications(list);
      }
    });
    return unsub;
  }, [userEmail]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeFilter === 'unread') return !n.read;
      if (activeFilter === 'boarding') return n.type === 'boarding' || n.type === 'proximity';
      if (activeFilter === 'payment') return n.type === 'payment';
      if (activeFilter === 'incident') return n.type === 'incident';
      return true;
    });
  }, [notifications, activeFilter]);

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(userEmail);
  };

  const handleClearAll = () => {
    if (window.confirm('Deseja realmente limpar todo o histórico de notificações?')) {
      clearAllNotifications(userEmail);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id);
    }

    if (notif.actionType === 'finance' && onNavigateTab) {
      onNavigateTab('finance');
      onClose();
    } else if (notif.actionType === 'routes' && onNavigateTab) {
      onNavigateTab('routes');
      onClose();
    } else if (notif.actionType === 'incident' && onNavigateTab) {
      onNavigateTab('routes');
      onClose();
    }
  };

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'proximity':
        return <Bus size={18} className="text-amber-600" />;
      case 'boarding':
        return <Bus size={18} className="text-blue-600" />;
      case 'payment':
        return <Wallet size={18} className="text-emerald-600" />;
      case 'incident':
        return <AlertTriangle size={18} className="text-red-600" />;
      default:
        return <Bell size={18} className="text-gray-600" />;
    }
  };

  const getBgForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'proximity':
        return 'bg-amber-100 border-amber-200 text-amber-900';
      case 'boarding':
        return 'bg-blue-100 border-blue-200 text-blue-900';
      case 'payment':
        return 'bg-emerald-100 border-emerald-200 text-emerald-900';
      case 'incident':
        return 'bg-red-100 border-red-200 text-red-900';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-900';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-950/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white w-full max-w-2xl rounded-[32px] sm:rounded-[36px] shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 via-gray-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shadow-md shrink-0">
              <BellRing size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg sm:text-xl text-white">
                  Central de Notificações
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-300 font-medium">
                Histórico em tempo real de embarques, avisos e mensalidades
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Bar & Action Controls */}
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
                activeFilter === 'all'
                  ? "bg-gray-950 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-200/70 border border-gray-200"
              )}
            >
              Todas ({notifications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('unread')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                activeFilter === 'unread'
                  ? "bg-gray-950 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-200/70 border border-gray-200"
              )}
            >
              <span>Não lidas</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('boarding')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1",
                activeFilter === 'boarding'
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-200/70 border border-gray-200"
              )}
            >
              <Bus size={13} />
              <span>Van & Rotas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('payment')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1",
                activeFilter === 'payment'
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-200/70 border border-gray-200"
              )}
            >
              <Wallet size={13} />
              <span>Mensalidades</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('incident')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1",
                activeFilter === 'incident'
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-200/70 border border-gray-200"
              )}
            >
              <AlertTriangle size={13} />
              <span>Imprevistos</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-gray-700 hover:text-gray-950 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-gray-200/60 transition-all cursor-pointer"
                title="Marcar todas como lidas"
              >
                <CheckCheck size={14} className="text-blue-600" />
                <span>Marcar lidas</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                title="Limpar histórico"
              >
                <Trash2 size={13} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications Scrollable List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <Bell size={28} className="opacity-40" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 text-base">Nenhuma notificação por aqui</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  {activeFilter === 'unread' 
                    ? 'Você já leu todas as suas notificações!' 
                    : 'Assim que a van iniciar o trajeto, houver novidades sobre embarques, mensalidades ou imprevistos, elas aparecerão aqui.'}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isUnread = !notif.read;
              const isProximity = notif.type === 'proximity';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col sm:flex-row sm:items-start justify-between gap-3.5",
                    isUnread
                      ? isProximity
                        ? "bg-amber-50/80 border-amber-300 shadow-xs ring-1 ring-amber-300/60"
                        : "bg-blue-50/70 border-blue-200 shadow-xs ring-1 ring-blue-300/50"
                      : "bg-white hover:bg-gray-50 border-gray-200/80"
                  )}
                >
                  {/* Left Side: Icon + Message */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold border",
                      getBgForType(notif.type)
                    )}>
                      {getIconForType(notif.type)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={cn(
                          "text-sm font-extrabold leading-tight",
                          isUnread ? "text-gray-950" : "text-gray-800"
                        )}>
                          {notif.title}
                        </h4>

                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}

                        {isProximity && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-400 text-gray-950">
                            Avanço de Rota
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed break-words font-medium">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatRelativeTime(notif.timestamp)}
                        </span>

                        {notif.studentName && (
                          <span>• Passageiro: <strong className="text-gray-600">{notif.studentName}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Actions & Context */}
                  <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    {notif.actionType && (
                      <span className="text-[11px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        {notif.actionType === 'finance' && 'Ver Cobrança'}
                        {notif.actionType === 'routes' && 'Acompanhar'}
                        {notif.actionType === 'incident' && 'Ver Detalhes'}
                        <ChevronRight size={13} />
                      </span>
                    )}

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationAsRead(notif.id);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100"
                          title="Marcar como lida"
                        >
                          <Check size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Excluir notificação"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="font-semibold flex items-center gap-1.5">
            <Sparkles size={14} className="text-yellow-500" />
            SchoolVan Alertas Automáticos
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-950 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
