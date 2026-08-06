import { HelpFaqBrowser } from "@/components/help/help-faq-browser";
import {
  FAQ_BY_ROLE,
  HELP_INTRO,
  type HelpRole,
} from "@/lib/help/faq-data";

export function RoleHelpPage({ role }: { role: HelpRole }) {
  const intro = HELP_INTRO[role];
  const articles = FAQ_BY_ROLE[role];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#0c1f2e]">
          {intro.title}
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600">{intro.blurb}</p>
      </header>
      <HelpFaqBrowser articles={articles} roleLabel={role} />
    </div>
  );
}
