/** Forms stand on their own, without the website's header and footer, so
 *  they work the same as a shared link, embedded in another page, or on a
 *  tablet in the foyer. */
export default function FormLayout({ children }: { children: React.ReactNode }) {
  return <main className="fr-shell">{children}</main>;
}
