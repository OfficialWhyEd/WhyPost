import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Film, CalendarDays,
  Bot, BrainCircuit, Settings, Sun, Moon, Clapperboard,
} from 'lucide-react';

export type Page = 'home' | 'queue' | 'calendar' | 'agents' | 'memory' | 'clack' | 'settings';

interface NavItem {
  id: Page;
  icon: React.FC<{ size?: number }>;
  label: string;
  group: 'main' | 'system';
}

const NAV: NavItem[] = [
  { id: 'home',     icon: LayoutDashboard, label: 'Home',           group: 'main'   },
  { id: 'queue',    icon: Film,            label: 'Coda video',     group: 'main'   },
  { id: 'calendar', icon: CalendarDays,    label: 'Calendario',     group: 'main'   },
  { id: 'agents',   icon: Bot,             label: 'Agenti',         group: 'main'   },
  { id: 'memory',   icon: BrainCircuit,    label: 'Memoria AI',     group: 'main'   },
  { id: 'clack',    icon: Clapperboard,    label: 'WhyClack',       group: 'main'   },
  { id: 'settings', icon: Settings,        label: 'Impostazioni',   group: 'system' },
];

interface Props {
  page: Page;
  onNavigate: (p: Page) => void;
  queueCount?: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

function NavBtn({
  item, active, onClick, badge,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        onClick={onClick}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
        style={{
          position: 'relative',
          width: 38, height: 38,
          borderRadius: 9,
          background: active ? 'var(--accent-dim)' : 'transparent',
          border: `1px solid ${active ? 'rgba(52,211,153,0.2)' : 'transparent'}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: active ? 'var(--accent)' : hovered ? 'var(--text-2)' : 'var(--text-3)',
          transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          boxShadow: active ? 'inset 0 1px 0 rgba(52,211,153,0.1)' : 'none',
        }}
      >
        {/* Active bar */}
        {active && (
          <motion.div
            layoutId="activeBar"
            style={{
              position: 'absolute', left: -9, top: '50%',
              width: 3, height: 20, borderRadius: 2,
              background: 'var(--accent)',
              transform: 'translateY(-50%)',
            }}
            transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
          />
        )}
        <Icon size={16} />
        {badge !== undefined && badge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute', top: 4, right: 4,
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--danger)',
            }}
          />
        )}
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', left: 'calc(100% + 12px)',
              top: '50%', transform: 'translateY(-50%)',
              zIndex: 100, pointerEvents: 'none',
              whiteSpace: 'nowrap',
              background: 'var(--surf-3)',
              border: '1px solid var(--border-hi)',
              borderRadius: 7, padding: '5px 10px',
              fontSize: 11, fontWeight: 500, color: 'var(--text)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {item.label}
            {/* Arrow */}
            <div style={{
              position: 'absolute', right: '100%', top: '50%',
              marginTop: -4,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderRight: '5px solid var(--surf-3)',
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar({ page, onNavigate, queueCount, theme, onToggleTheme }: Props) {
  const mainItems = NAV.filter(n => n.group === 'main');
  const systemItems = NAV.filter(n => n.group === 'system');

  return (
    <div style={{
      width: 56, flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 14, paddingBottom: 14, gap: 0,
      background: 'var(--surf-1)',
      borderRight: '1px solid var(--border)',
    }}>
      {/* Logo */}
      <motion.div
        whileHover={{ scale: 1.06 }}
        transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
        style={{
          width: 30, height: 30, borderRadius: 8, marginBottom: 18,
          background: 'rgba(52,211,153,0.12)',
          border: '1px solid rgba(52,211,153,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'default',
          boxShadow: 'inset 0 1px 0 rgba(52,211,153,0.15)',
        }}
      >
        <span style={{
          fontFamily: 'NeuePower, Geist, sans-serif',
          fontSize: 11, fontWeight: 900, color: 'var(--accent)',
          letterSpacing: '-0.5px',
        }}>
          WP
        </span>
      </motion.div>

      {/* Main nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {mainItems.map(item => (
          <NavBtn
            key={item.id}
            item={item}
            active={page === item.id}
            onClick={() => onNavigate(item.id)}
            badge={item.id === 'queue' ? queueCount : undefined}
          />
        ))}
      </div>

      {/* Theme toggle */}
      <motion.button
        onClick={onToggleTheme}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
        title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
        style={{
          width: 38, height: 38, borderRadius: 9,
          background: 'transparent', border: '1px solid transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-3)',
          transition: 'color 0.15s',
        }}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </motion.button>

      {/* Divider */}
      <div style={{
        width: 22, height: 1, background: 'var(--border)',
        marginBottom: 8,
      }} />

      {/* System nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {systemItems.map(item => (
          <NavBtn
            key={item.id}
            item={item}
            active={page === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
