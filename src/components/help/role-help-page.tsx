import { HelpFaqBrowser } from "@/components/help/help-faq-browser";
import { PageHeading } from "@/components/page-heading";
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
      <PageHeading title={intro.title} info={intro.blurb} />
      <HelpFaqBrowser articles={articles} roleLabel={role} />
    </div>
  );
}
