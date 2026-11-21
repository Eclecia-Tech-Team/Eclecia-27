/** Placeholders the mail composer offers. Filled per recipient. */
export const MAIL_PLACEHOLDERS = [
  { key: "{{name}}", desc: "Their full name (or username)" },
  { key: "{{event}}", desc: "Event name (event audiences only)" },
  { key: "{{team}}", desc: "Team name (team events)" },
  { key: "{{teamCode}}", desc: "Team code (team events)" },
] as const;

export interface MailVars {
  name: string;
  event?: string;
  team?: string;
  teamCode?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Fill placeholders. Function replacers, so "$&" or "$'" in a name stay literal. */
export const fillVars = (text: string, v: MailVars) =>
  text
    .replace(/\{\{\s*name\s*\}\}/gi, () => v.name)
    .replace(/\{\{\s*event\s*\}\}/gi, () => v.event ?? "")
    .replace(/\{\{\s*team\s*\}\}/gi, () => v.team ?? "")
    .replace(/\{\{\s*teamCode\s*\}\}/gi, () => v.teamCode ?? "");

/**
 * Plain text to email HTML: blank lines make paragraphs, **bold**, and bare
 * links become clickable. Everything else is escaped.
 */
export function textToEmailHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((para) => {
      const html = escapeHtml(para)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#d9a441;">$1</a>')
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px;">${html}</p>`;
    })
    .join("");
}
