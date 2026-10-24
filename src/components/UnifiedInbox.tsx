import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Inbox, CheckCheck, ArrowUpRight } from 'lucide-react'
import { DialogItem, AccountInfo } from '../types/telegram'

interface UnifiedInboxProps {
  accounts: AccountInfo[]
  allDialogs: Record<string, DialogItem[]> // accountId -> dialogs
  onSelectAccountAndChat: (accountId: string, chatId: string) => void
}

export const UnifiedInbox: React.FC<UnifiedInboxProps> = ({
  accounts,
  allDialogs,
  onSelectAccountAndChat,
}) => {
  // Collect all unread dialogs across all accounts
  const unreadItems: { dialog: DialogItem; account: AccountInfo }[] = []

  accounts.forEach((acc) => {
    const dialogs = allDialogs[acc.id] || []
    dialogs.forEach((d) => {
      if (d.unreadCount > 0) {
        unreadItems.push({ dialog: d, account: acc })
      }
    })
  })

  return (
    <div className="flex-1 bg-dark-900 flex flex-col h-full overflow-hidden select-none titlebar-no-drag">
      {/* Header */}
      <div className="h-14 bg-dark-850 border-b border-white/5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/20">
            <Inbox className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-100">Unified Inbox</div>
            <div className="text-[10px] text-gray-400">
              Viewing unread messages across all {accounts.length} active accounts
            </div>
          </div>
        </div>

        <div className="text-xs font-semibold px-2.5 py-1 bg-accent-rose/10 text-accent-rose border border-accent-rose/20 rounded-xl flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent-rose animate-pulse" />
          <span>{unreadItems.length} Unread Chats</span>
        </div>
      </div>

      {/* Unread Feed */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-2.5">
        <AnimatePresence mode="wait">
          {unreadItems.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="flex flex-col items-center justify-center h-80 text-gray-500 gap-3"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-3xl bg-dark-800 flex items-center justify-center text-accent-emerald shadow-glow border border-accent-emerald/20"
              >
                <CheckCheck className="w-8 h-8" />
              </motion.div>
              <div className="text-sm font-semibold text-gray-300">All caught up!</div>
              <div className="text-xs text-gray-500">
                No unread messages across any of your accounts.
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {unreadItems.map(({ dialog, account }, idx) => {
                return (
                  <motion.div
                    key={`${account.id}_${dialog.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: Math.min(idx * 0.03, 0.3),
                      type: 'spring',
                      damping: 24,
                      stiffness: 350,
                    }}
                    whileHover={{ scale: 1.012, x: 3 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => onSelectAccountAndChat(account.id, dialog.id)}
                    className="p-4 bg-dark-800/80 hover:bg-dark-750 border border-white/5 hover:border-primary-500/30 rounded-2xl cursor-pointer transition-colors flex items-center justify-between group shadow-sm"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-cyan text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {dialog.avatarInitials}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-gray-100 group-hover:text-primary-300 transition-colors">
                            {dialog.title}
                          </span>
                          {/* Account Badge Indicator */}
                          <span className="text-[10px] font-semibold px-2 py-0.2 bg-dark-700 text-gray-300 rounded-full border border-white/5">
                            {account.firstName} ({account.phone})
                          </span>
                        </div>

                        <div className="text-xs text-gray-400 line-clamp-1 max-w-md">
                          {dialog.lastMessageText || 'New messages'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="bg-primary-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-glow">
                        {dialog.unreadCount}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-primary-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
export default UnifiedInbox
