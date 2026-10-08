import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DbIcon } from '@/components/ui/db-icon';
import { NewChatIcon, SidebarCollapseIcon, SidebarExpandIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { ClientSession } from '@chat-template/auth';
import { Button } from './ui/button';
import { Action } from './elements/actions';
import { AppNameText, BrandMark, TechcombankLogo } from './brand';

export function AppSidebar({
  user,
  preferredUsername,
}: {
  user: ClientSession['user'] | undefined;
  preferredUsername: string | null;
}) {
  const navigate = useNavigate();
  const { setOpenMobile, open, openMobile, isMobile, toggleSidebar } = useSidebar();

  const effectiveOpen = open || (isMobile && openMobile);

  return (
    <Sidebar
      collapsible="icon"
      className="group-data-[side=left]:border-r-0"
    >
      {/* ── Header: app title + collapse toggle ────────────────────────── */}
      <SidebarHeader
        className={cn(
          'border-b border-sidebar-border',
          effectiveOpen
            ? 'gap-3 px-3 pt-4 pb-3'
            : 'h-[44px] flex-row items-center justify-center px-2 py-0',
        )}
      >
        {effectiveOpen && (
          <Link
            to="/"
            onClick={() => setOpenMobile(false)}
            className="block w-full"
            aria-label="RISK AI NAVIGATOR home"
          >
            {/* Logo fills the full width of the pane */}
            <TechcombankLogo />
          </Link>
        )}

        <div
          className={cn(
            'flex items-center gap-2',
            effectiveOpen ? 'justify-between' : 'justify-center',
          )}
        >
          {effectiveOpen ? (
            <AppNameText />
          ) : (
            <span className="sr-only">RISK AI NAVIGATOR</span>
          )}
          <Action
            onClick={toggleSidebar}
            tooltip={effectiveOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <DbIcon
              icon={effectiveOpen ? SidebarCollapseIcon : SidebarExpandIcon}
              size={16}
              color="muted"
            />
          </Action>
        </div>
      </SidebarHeader>

      {!effectiveOpen && (
        <div className="flex justify-center pt-3">
          <BrandMark size={22} />
        </div>
      )}

      {/* ── Nav: New Chat item ───────────────────────────────────────────── */}
      <div className="px-2 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  type="button"
                  className="h-8 p-1 md:p-2 cursor-pointer"
                  onClick={() => {
                    setOpenMobile(false);
                    navigate('/');
                  }}
                >
                  <DbIcon icon={NewChatIcon} size={16} color="default" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    New chat
                  </span>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right" style={{ display: open ? 'none' : 'block' }}>New chat</TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>

      {/* ── Chat history ────────────────────────────────────────────────── */}
      <SidebarContent>
        {effectiveOpen && <SidebarHistory user={user} />}
      </SidebarContent>

      {/* ── User nav ────────────────────────────────────────────────────── */}
      <SidebarFooter>
        {user && (
          <SidebarUserNav user={user} preferredUsername={preferredUsername} />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
