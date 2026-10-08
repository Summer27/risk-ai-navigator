import { useNavigate } from 'react-router-dom';

import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';
import { useConfig } from '@/hooks/use-config';
import { PlusIcon } from './icons';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/skeleton';

function OboScopeBanner({ missingScopes }: { missingScopes: string[] }) {
  if (missingScopes.length === 0) return null;

  return (
    <div className="w-full border-b border-red-500/20 bg-red-50 dark:bg-red-950/20 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <TriangleAlert className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <p className="text-sm text-red-700 dark:text-red-400">
          RISK AI NAVIGATOR acts with your own Databricks permissions, but
          this app is missing the user authorization scopes{' '}
          <strong>{missingScopes.join(', ')}</strong>. Please contact the app
          administrator.
        </p>
      </div>
    </div>
  );
}

export function ChatHeader({ title, empty, isLoadingTitle }: { title?: string, empty?: boolean, isLoadingTitle?: boolean }) {
  const navigate = useNavigate();
  const { oboMissingScopes } = useConfig();

  return (
    <>
      <header className={cn("sticky top-0 flex h-[60px] items-center gap-2 bg-background px-4", {
        "border-b border-border md:pb-2": !empty,
      })}>
        {/* Toggle visible on mobile only — desktop toggle lives inside the sidebar */}
        <div className="md:hidden">
          <SidebarToggle forceOpenIcon />
        </div>

        {(title || isLoadingTitle) &&
          <h4 className="text-[16px] font-medium truncate">
            {isLoadingTitle ?
              <Skeleton className="w-32 h-6 bg-border" /> :
              title
            }
          </h4>
        }

        <div className="ml-auto flex items-center gap-2">
          {/* New Chat button — mobile only; desktop uses the sidebar rail */}
          <Button
            variant="default"
            className="order-2 ml-auto h-8 px-2 md:hidden"
            onClick={() => {
              navigate('/');
            }}
          >
            <PlusIcon />
            <span>New Chat</span>
          </Button>
        </div>
      </header>

      <OboScopeBanner missingScopes={oboMissingScopes} />
    </>
  );
}
