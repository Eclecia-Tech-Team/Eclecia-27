/** Heading above the events and teams lists: small kicker over an italic serif title. */
export default function TabHeading({
  kicker,
  count,
  title,
}: {
  kicker: string;
  count?: number;
  title: string;
}) {
  return (
    <header className="pf-head">
      <p className="pf-eyebrow">
        {kicker}
        {count !== undefined && ` (${count})`}{" "}
      </p>
      <h2 className="pf-head-title">{title}</h2>
    </header>
  );
}
