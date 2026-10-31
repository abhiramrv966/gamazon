import Link from 'next/link';
export default function Guidelines() {
  return (
    <main className="policy-page">
      <Link href="/" className="brand">
        gamazon.
      </Link>
      <h1>Community guidelines and privacy</h1>
      <p>
        Gamazon connects adults in a community around original physical console games. These rules
        apply to profiles, posts, comments, and messages.
      </p>
      <h2>Community guidelines</h2>
      <ul>
        <li>
          Original discs and cartridges only. Do not offer accounts, passwords, digital licences,
          counterfeit media, or paid rentals. A moderator may remove prohibited offers.
        </li>
        <li>
          Describe the actual copy honestly: console generation, physical format, condition,
          downloads, and code limitations. Do not promise that redeemed DLC transfers.
        </li>
        <li>
          Be respectful. No harassment, threats, scams, spam, or publishing someone’s personal
          information.
        </li>
        <li>
          Agree privately on meeting arrangements, condition, and any return expectations. Meet in a
          public place. Never share account passwords or authentication codes.
        </li>
        <li>
          Members arrange exchanges and any permitted payments independently. Gamazon does not hold
          funds, guarantee fulfilment, or provide financial protection.
        </li>
        <li>
          Use report and block. Moderators review the reported item and submitted context, not
          unrestricted private inboxes. Removal or suspension decisions are recorded. Appeal by
          contacting the community administrator with the report reference.
        </li>
      </ul>
      <h2>Privacy</h2>
      <p>
        Your display name, neighbourhood, bio, game shelves, console interests, connections, posts,
        and comments are visible to active members of your community. Do not enter your home
        address. Your sign-in email is not displayed on your profile.
      </p>
      <p>
        Messages are accessible to the participants. Reporting a message shares that item and your
        explanation with moderators. Messages are not end-to-end encrypted. Authorised staff may
        access stored data when needed to run the service. No message content is used for
        advertising or analytics.
      </p>
      <p>
        Signing in uses essential cookies. We remove hidden details such as location from uploaded
        photos. Photo links expire within 60 seconds. Previously viewed content cannot be removed
        from someone’s device.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        You can delete posts and your community account in Settings. Account deletion removes the
        profile, shelves, posts, and authored messages. Existing replies may be removed when their
        parent is deleted. Moderation evidence is retained for up to 90 days after resolution, then
        deleted by scheduled maintenance. Open cases are reviewed by the organiser and must not be
        kept indefinitely.
      </p>
      <p>
        Read notifications are deleted after 30 days. Deleted account data may remain in restricted
        backups for up to 30 days.
      </p>
      <h2>Exchange feedback</h2>
      <p>
        Optional exchange confirmations help us understand whether the community is useful. Each
        response is private. We count exchanges confirmed by both people separately from those
        reported by just one person. A confirmation does not verify condition, safety, or payment.
      </p>
      <h2>Questions or concerns</h2>
      <p>
        Contact the community administrator if you have questions about your data or a moderation
        decision.
      </p>
      <Link href="/community">← Back to the community</Link>
    </main>
  );
}
