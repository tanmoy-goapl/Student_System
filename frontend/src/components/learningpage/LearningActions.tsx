'use client';

import React from 'react';
import {
  File,
} from 'lucide-react';

import { getStrengthClasses } from '@/utils/getStrengthClasses';

export interface LearningAction {
  id: string;
  label: string;
  subLabel: string;
  icon: React.ElementType;
  variant: 'neutral' | 'weak' | 'medium' | 'strong';
}

interface LearningActionsProps {
  title?: string;
  actions: LearningAction[];

  onActionClick?: (id: string) => void;

  onSaveNotes?: () => void;
  onAddRevision?: () => void;
}

interface LearningActionItemProps {
  item: LearningAction;
  onClick?: (id: string) => void;
}

function LearningActionItem({
  item,
  onClick,
}: LearningActionItemProps) {
  const Icon = item.icon;

  const styles = getStrengthClasses(item.variant);

  return (
    <button
      onClick={() => onClick?.(item.id)}
      className={`group rounded-xl border p-4 text-left transition-all duration-200 space-y-2 hover:scale-[1.01] ${styles.card}`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.badge}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div>
        <h3 className="text-xs text-white">
          {item.label}
        </h3>

        <p className="text-[0.65rem] text-neutral-400">
          {item.subLabel}
        </p>
      </div>
    </button>
  );
}

export function LearningActions({
  title = 'Learning Actions',
  actions,
  onActionClick,
  onSaveNotes,
  onAddRevision,
}: LearningActionsProps) {
  return (
    <div className="border-t border-white/10 pt-6 mt-6 pb-2 space-y-4">
      <div className="flex items-center gap-2">
        <File className="h-4 w-4 text-indigo-400" />

        <h2 className="text-sm font-semibold text-white">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <LearningActionItem
            key={action.id}
            item={action}
            onClick={onActionClick}
          />
        ))}
      </div>
    </div>
  );
}

