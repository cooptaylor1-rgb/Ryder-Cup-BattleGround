/**
 * iOS Context Menu — Native Long-Press Menu
 *
 * Replicates iOS's beautiful context menu experience:
 * - Long press activation with haptic
 * - Blur backdrop with scale animation
 * - Icon + label menu items
 * - Destructive action styling
 * - Submenu support
 * - Keyboard accessibility
 */

'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  createContext,
  type ReactNode,
  type ReactElement,
} from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

// ============================================
// Types
// ============================================

export interface ContextMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon component */
  icon?: ReactElement;
  /** Is this a destructive action */
  destructive?: boolean;
  /** Is this item disabled */
  disabled?: boolean;
  /** Submenu items */
  submenu?: ContextMenuItem[];
  /** Action handler */
  onSelect?: () => void;
  /** Keyboard shortcut hint */
  shortcut?: string;
}

export interface ContextMenuProps {
  /** The trigger element */
  children: ReactNode;
  /** Menu items */
  items: ContextMenuItem[];
  /** Long press duration (ms) */
  longPressDuration?: number;
  /** Enable haptic feedback */
  haptics?: boolean;
  /** Callback when menu opens */
  onOpen?: () => void;
  /** Callback when menu closes */
  onClose?: () => void;
  /** Disable the context menu */
  disabled?: boolean;
}

// ============================================
// Context for nested menus
// ============================================

interface ContextMenuContext {
  closeMenu: () => void;
}

const MenuContext = createContext<ContextMenuContext | null>(null);

// ============================================
// Utilities
// ============================================

function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'medium') {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 40 };
    navigator.vibrate(patterns[type]);
  }
}

// ============================================
// Menu Item Component
// ============================================

interface MenuItemProps {
  item: ContextMenuItem;
  onSelect: () => void;
  isHovered: boolean;
  onHover: () => void;
}

function MenuItem({ item, onSelect, isHovered, onHover }: MenuItemProps) {
  const [showSubmenu, setShowSubmenu] = useState(false);
  const hasSubmenu = item.submenu && item.submenu.length > 0;

  const handleClick = useCallback(() => {
    if (item.disabled) return;

    if (hasSubmenu) {
      setShowSubmenu(!showSubmenu);
      return;
    }

    triggerHaptic('light');
    item.onSelect?.();
    onSelect();
  }, [item, hasSubmenu, showSubmenu, onSelect]);

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={onHover}
        disabled={item.disabled}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3',
          'text-left transition-colors duration-100',
          isHovered && !item.disabled && 'bg-[color:var(--surface-secondary)]',
          item.destructive && 'text-[color:var(--error)]',
          item.disabled && 'opacity-40 cursor-not-allowed',
          !item.disabled && !item.destructive && 'text-ink'
        )}
      >
        {/* Icon */}
        {item.icon && (
          <span
            className={cn(
              'w-5 h-5 shrink-0',
              item.destructive ? 'text-[color:var(--error)]' : 'text-ink-secondary'
            )}
          >
            {item.icon}
          </span>
        )}

        {/* Label */}
        <span className="flex-1 font-medium text-[15px]">{item.label}</span>

        {/* Shortcut or submenu indicator */}
        {item.shortcut && (
          <span className="text-xs text-ink-tertiary font-mono">
            {item.shortcut}
          </span>
        )}

        {hasSubmenu && (
          <ChevronRight className="w-4 h-4 text-ink-tertiary" />
        )}
      </button>

      {/* Submenu */}
      {hasSubmenu && showSubmenu && (
        <div className="absolute left-full top-0 ml-1">
          <ContextMenuItems items={item.submenu!} onClose={onSelect} />
        </div>
      )}
    </div>
  );
}

// ============================================
// Menu Items Container
// ============================================

interface ContextMenuItemsProps {
  items: ContextMenuItem[];
  onClose: () => void;
}

function ContextMenuItems({ items, onClose }: ContextMenuItemsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group items by having destructive ones at the end
  const groupedItems = [
    ...items.filter((i) => !i.destructive),
    ...items.filter((i) => i.destructive),
  ];

  const hasDestructive = items.some((i) => i.destructive);
  const destructiveStartIndex = items.filter((i) => !i.destructive).length;

  return (
    <div
      className={cn(
        'bg-[color:var(--surface-raised)]/95 backdrop-blur-xl rounded-2xl shadow-2xl',
        'border border-[color:var(--rule)]/40 overflow-hidden min-w-50',
        'animate-in fade-in zoom-in-95 duration-150'
      )}
    >
      {groupedItems.map((item, index) => (
        <React.Fragment key={item.id}>
          {/* Separator before destructive items */}
          {hasDestructive && index === destructiveStartIndex && (
            <div className="h-px bg-[color:var(--rule)]/60 my-1" />
          )}

          <MenuItem
            item={item}
            onSelect={onClose}
            isHovered={hoveredIndex === index}
            onHover={() => setHoveredIndex(index)}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================
// Main Context Menu Component
// ============================================

export function IOSContextMenu({
  children,
  items,
  longPressDuration = 500,
  haptics = true,
  onOpen,
  onClose,
  disabled = false,
}: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const isLongPressing = useRef(false);

  // Clear long press timer
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isLongPressing.current = false;
  }, []);

  // Open menu at position
  const openMenu = useCallback(
    (x: number, y: number) => {
      if (disabled) return;

      const rect = triggerRef.current?.getBoundingClientRect();
      setTriggerRect(rect || null);

      // Adjust position to stay within viewport
      const menuWidth = 220;
      const menuHeight = items.length * 48 + 16;

      let adjustedX = x;
      let adjustedY = y;

      if (x + menuWidth > window.innerWidth - 20) {
        adjustedX = window.innerWidth - menuWidth - 20;
      }
      if (y + menuHeight > window.innerHeight - 20) {
        adjustedY = window.innerHeight - menuHeight - 20;
      }

      setPosition({ x: Math.max(20, adjustedX), y: Math.max(20, adjustedY) });
      setIsOpen(true);

      if (haptics) {
        triggerHaptic('heavy');
      }

      onOpen?.();
    },
    [disabled, items.length, haptics, onOpen]
  );

  // Close menu
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setTriggerRect(null);
    onClose?.();
  }, [onClose]);

  // Touch start handler
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      startPos.current = { x: touch.clientX, y: touch.clientY };
      isLongPressing.current = true;

      // Start haptic feedback early (light tap)
      if (haptics) {
        setTimeout(() => {
          if (isLongPressing.current) {
            triggerHaptic('light');
          }
        }, 100);
      }

      longPressTimer.current = setTimeout(() => {
        if (isLongPressing.current) {
          openMenu(touch.clientX, touch.clientY);
        }
      }, longPressDuration);
    },
    [disabled, haptics, longPressDuration, openMenu]
  );

  // Touch move handler
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startPos.current.x);
      const dy = Math.abs(touch.clientY - startPos.current.y);

      // Cancel if moved too much
      if (dx > 10 || dy > 10) {
        clearLongPress();
      }
    },
    [clearLongPress]
  );

  // Touch end handler
  const handleTouchEnd = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  // Context menu handler (right-click on desktop)
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      e.preventDefault();
      openMenu(e.clientX, e.clientY);
    },
    [disabled, openMenu]
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeMenu]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearLongPress();
  }, [clearLongPress]);

  return (
    <MenuContext.Provider value={{ closeMenu }}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={handleContextMenu}
        className="touch-none"
      >
        {children}
      </div>

      {/* Menu portal */}
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <div
            className="fixed inset-0 z-9998 bg-[color:var(--ink)]/20 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={closeMenu}
          />

          {/* Scaled trigger preview (iOS effect) */}
          {triggerRect && (
            <div
              className="fixed z-9999 pointer-events-none animate-in zoom-in-105 duration-200"
              style={{
                left: triggerRect.left,
                top: triggerRect.top,
                width: triggerRect.width,
                height: triggerRect.height,
              }}
            >
              <div
                className="w-full h-full rounded-xl shadow-2xl bg-[color:var(--surface-raised)]/80 backdrop-blur"
                style={{ transform: 'scale(1.02)' }}
              />
            </div>
          )}

          {/* Menu */}
          <div
            ref={menuRef}
            className="fixed z-10000"
            style={{
              left: position.x,
              top: position.y,
            }}
          >
            <ContextMenuItems items={items} onClose={closeMenu} />
          </div>
        </>
      )}
    </MenuContext.Provider>
  );
}

// ============================================
// Hook for programmatic control
// ============================================

export function useContextMenu(items: ContextMenuItem[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const open = useCallback((x: number, y: number) => {
    setPosition({ x, y });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const contextMenuProps = {
    items,
    position,
    isOpen,
    onClose: close,
  };

  return {
    isOpen,
    open,
    close,
    contextMenuProps,
  };
}

export default IOSContextMenu;
