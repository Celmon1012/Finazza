import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = { title: "Privacy Policy · FINAZZA" };

const notice =
  "DRAFT FOR LEGAL REVIEW. This draft was prepared from the FINAZZA product roadmap (October 2026) and is not legal advice. Items in [SQUARE BRACKETS] are placeholders. A qualified lawyer in [JURISDICTION] should review and adapt it before publication, including any local privacy-law requirements (for example GDPR/UK GDPR, CCPA/CPRA, PIPEDA, the Australian Privacy Act or PIPA) and any financial-promotion rules.";

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      meta="Effective date: [EFFECTIVE DATE] • Last updated: [LAST UPDATED DATE]"
      notice={notice}
      otherHref="/terms"
      otherLabel="Terms of Use"
      sections={[
        {
          heading: "1. Who we are",
          blocks: [
            'FINAZZA (the "Platform") is an investment-focused social network operated by [COMPANY LEGAL NAME], a company registered in [JURISDICTION] under company number [COMPANY NUMBER], with its registered office at [REGISTERED ADDRESS] ("FINAZZA", "we", "us" or "our").',
            'This Privacy Policy explains what personal information we collect when you use the FINAZZA website and web application (together, the "Service"), how we use and share it, and the choices and rights you have. If you have questions, contact us at [PRIVACY CONTACT EMAIL]. [If required: Our data protection officer / EU or UK representative is [NAME AND CONTACT DETAILS].]',
          ],
        },
        {
          heading: "2. The most important thing to know: much of FINAZZA is public",
          blocks: [
            "FINAZZA is built around public sharing, much like X.com. Unless a feature is described as private, assume that what you post can be seen by anyone, including people who are not logged in and search engines. In particular:",
            {
              bullets: [
                "Public by design: your profile (username, display name, avatar, header image, bio, follower and following counts), your posts, replies and reposts, your past trades and current holdings, any proof of investment you upload, annotated charts you post, and messages you send in public topic rooms.",
                "Visible to selected people: messages in one-to-one direct messages are visible to you and the other participant. Messages in group chats are visible to all current and future members of that group (up to 50 members), including members who join after the message was sent.",
                "Not end-to-end encrypted: direct messages and group chats are stored on our servers and are not end-to-end encrypted. Our authorised staff and moderators may access them in the limited situations described in section 6.",
              ],
            },
            "Before you upload proof of investment (such as a receipt or brokerage confirmation), remove your real name, account numbers, addresses, signatures and any other details you do not want the public to see. The Platform reminds you to do this and asks you to confirm it, but we do not review proof files before they are published, and we cannot undo copies other people may have already made.",
          ],
        },
        {
          heading: "3. Information we collect",
          blocks: [
            "3.1 Information you give us",
            {
              bullets: [
                "Account information: email address, username, display name and password. We store passwords only in hashed form; we cannot see your password.",
                "Profile information: avatar, header image, bio and any other details you add to your profile.",
                "Investment records: past trades and current holdings you enter manually, such as asset class (stock, ETF, commodity, collectible or other), asset name, quantity, unit, buy and sale prices, dates, notes, and returns calculated from those values.",
                "Proof of investment: image or PDF files you upload and link to an investment record (for example a payment receipt), together with the upload date and your confirmation that you removed sensitive information. Proof files may contain personal or financial information if you do not redact it.",
                "Posts and content: posts, replies, reposts, likes, follows, @mentions, images and other attachments.",
                "Chart annotations: chart images you upload to the chart annotator, the drawings and labels you add, and the exported annotated image.",
                "Messages: the content of messages and images you send in topic rooms, direct messages and group chats; group names; who you invite to or remove from a group; and message history.",
                "Reports and moderation: reports you submit about posts, messages, investment records, proof or users, including the reason you give.",
                "Settings and preferences: notification preferences, who may message you or add you to group chats (everyone or followers only), and your lists of muted and blocked users.",
                "Communications with us: support requests, feedback and any other information you send us.",
              ],
            },
            "3.2 Information we collect automatically",
            {
              bullets: [
                "Log and device information: IP address, browser type and version, device type, operating system, referring pages, and the date and time of requests.",
                "Usage information: pages and features you use, actions you take (such as posting, liking or joining a room), unread counts and read status of notifications and messages, and connection events for real-time chat.",
                "Cookies and similar technologies: see section 9.",
              ],
            },
            "File metadata: when you upload an image or document, we attempt to strip embedded metadata (such as EXIF data, which can include location and device details) before storing or displaying it. Visible content inside the file itself is not removed, so please redact it yourself.",
            "3.3 Information from other people",
            "Other users may give us information about you, for example when they @mention you, reply to you, invite you to a group chat, send you a message or report your content or account.",
            "3.4 Information we do not collect",
            "FINAZZA does not connect to your brokerage, bank or wallet, does not collect your login credentials for those services, and does not process payments in the current version of the Service. We do not verify investment records or proof. [Update this section if payments, brokerage connections or identity verification are added later.]",
          ],
        },
        {
          heading: "4. How we use your information",
          blocks: [
            "We use personal information to:",
            {
              bullets: [
                "Provide the Service: create and manage your account, display your profile, feed, investment records and proof, deliver messages in real time, calculate simple returns from the values you enter, and run the chart annotator.",
                "Send notifications: show in-app notifications for likes, replies, reposts, new followers, @mentions, chat activity and moderation outcomes, according to your settings.",
                "Send service emails: account confirmation, password reset, security alerts and important changes to the Service or these policies. [If email digests or marketing emails are added later, describe them here and how to opt out.]",
                "Keep the Platform safe: enforce our Terms of Use, apply rate limits and word filters, detect spam, abuse, fake or misleading proof and market manipulation, review reports, and take action such as removing content or suspending accounts.",
                "Secure the Service: authenticate you, prevent fraud and unauthorised access, validate and scan uploaded files, and investigate security incidents.",
                "Improve the Service: understand how features are used, fix bugs and develop new features (such as mobile apps).",
                "Comply with law: meet legal, regulatory and law-enforcement obligations, and establish, exercise or defend legal claims.",
              ],
            },
            "We do not sell your personal information, and we do not use the content of your direct messages or group chats for advertising. [Confirm: the Service currently shows no third-party advertising.]",
          ],
        },
        {
          heading: "5. Legal bases (where GDPR or UK GDPR applies)",
          blocks: [
            "[Lawyer to confirm whether and how this section applies.] We rely on the following legal bases:",
            {
              bullets: [
                "Contract: to provide the Service you signed up for, including your profile, posts, investment records, proof, messaging and notifications.",
                "Legitimate interests: to keep the Platform safe and secure, moderate content, prevent abuse, improve the Service and communicate with you about it. We balance these interests against your rights.",
                "Consent: where we ask for it, for example for non-essential cookies. You can withdraw consent at any time.",
                "Legal obligation: where the law requires us to process or retain information.",
              ],
            },
            'Financial details in investment records and proof are not "special category" data under GDPR, but we treat them with care. You choose to make them public, and you can delete them at any time.',
          ],
        },
        {
          heading: "6. Moderation, reporting and access to messages",
          blocks: [
            "To keep FINAZZA safe, we operate reporting and moderation tools:",
            {
              bullets: [
                "Reports: you can report posts, messages, investment records, proof files and users. We store the report, the reported content and the outcome. We do not tell the reported user who reported them, unless the law requires us to.",
                "Who reviews: reports are reviewed by our authorised staff or moderators [state whether in-house staff, contractors or volunteer moderators]. Moderators can view reported content and the surrounding context.",
                "Access to private messages: we do not routinely read direct messages or group chats. Authorised staff may access them when a participant reports a message or conversation, when automated filters flag content, when needed to investigate a security incident or a breach of our Terms of Use, or when required by law.",
                "Actions we may take: remove or hide content, add labels, mute or restrict features, suspend or terminate accounts, and in serious cases preserve information and refer it to law enforcement or regulators.",
                "Automated tools: we use automated rate limits and basic word filtering. These do not by themselves produce decisions with legal or similarly significant effects on you; account suspensions are reviewed by a person. [Confirm.]",
                "Notifications: you may receive a notification about the outcome of a report you made or an action taken on your content.",
              ],
            },
          ],
        },
        {
          heading: "7. How we share information",
          blocks: [
            {
              bullets: [
                "With the public and other users: as described in section 2. Blocked users cannot send you direct messages, add you to group chats or generate notifications for you, but they may still be able to see your public content.",
                "Service providers: companies that host and operate the Service for us under contract, such as cloud hosting, database, file storage and content delivery, real-time messaging infrastructure, email delivery and monitoring. [List or link current providers, for example Vercel, Render or AWS, MongoDB Atlas, Amazon S3 or Cloudinary, and Resend or Amazon SES, once confirmed.] They may only use your information to provide services to us.",
                "Legal and safety reasons: to comply with law, a court order or a lawful request from authorities; to enforce our Terms; or to protect the rights, property or safety of FINAZZA, our users or the public, including by reporting suspected fraud or market abuse.",
                "Business transfers: in connection with a merger, acquisition, financing or sale of assets, subject to this Policy.",
                "With your consent or at your direction.",
              ],
            },
            "We may share aggregated or de-identified information that cannot reasonably identify you.",
          ],
        },
        {
          heading: "8. Retention",
          blocks: [
            "We keep personal information for as long as your account is active and as needed to provide the Service, then as follows [lawyer to confirm periods]:",
            {
              bullets: [
                "Content you delete (posts, investment records, proof files, messages) is removed from the Service promptly and deleted from backups within [30] days.",
                'When you delete your account, we delete or anonymise your profile, posts, investment records and proof within [30] days. Messages you sent in direct messages and group chats [are deleted / remain visible to other participants as "deleted user"] [choose one].',
                "Reports and moderation records are kept for [12 months / 2 years] after the case is closed to prevent repeat abuse and handle appeals.",
                "Security logs are kept for [90 days].",
                "We may keep information longer where the law requires it or to resolve disputes and enforce our agreements.",
              ],
            },
            "Content that was public may have been copied, shared or indexed by others before you deleted it, and we cannot control those copies.",
          ],
        },
        {
          heading: "9. Cookies and similar technologies",
          blocks: [
            "We use cookies and similar technologies that are strictly necessary to sign you in, keep your session secure and remember your settings. [If analytics or other non-essential cookies are used, list them here, describe their purpose, and provide a consent banner and a way to change your choices.]",
          ],
        },
        {
          heading: "10. Your choices and controls",
          blocks: [
            {
              bullets: [
                "Edit or delete your profile, posts, investment records, proof files and annotated charts at any time.",
                "Control messaging: choose whether everyone or only followers can message you or add you to group chats; leave any group chat; mute or block users.",
                "Notifications: turn notification types on or off in your settings, and mark items as read.",
                "Delete your account from your settings or by contacting us.",
              ],
            },
          ],
        },
        {
          heading: "11. Your rights",
          blocks: [
            "Depending on where you live, you may have the right to access, correct, delete, or receive a copy of your personal information; to object to or restrict certain processing; to withdraw consent; and to complain to a data protection authority. [If CCPA/CPRA applies: residents of California may also have the right to know, delete, correct and opt out of the sale or sharing of personal information. We do not sell or share personal information for cross-context behavioural advertising.]",
            "To make a request, contact [PRIVACY CONTACT EMAIL]. We may need to verify your identity before responding, and we will respond within the time required by law. We will not discriminate against you for exercising your rights.",
          ],
        },
        {
          heading: "12. Security",
          blocks: [
            "We use reasonable technical and organisational measures to protect your information, including encrypted connections (HTTPS), hashed passwords, access controls, server-side validation, file-type and size restrictions, metadata stripping and, where feasible, file scanning. No system is completely secure. Please use a strong, unique password and tell us promptly at [SECURITY CONTACT EMAIL] if you believe your account has been compromised.",
          ],
        },
        {
          heading: "13. International transfers",
          blocks: [
            "We and our service providers may store and process information in [COUNTRIES, e.g. the United States] and other countries whose data protection laws may differ from yours. Where required, we use appropriate safeguards such as standard contractual clauses. [Lawyer to confirm.]",
          ],
        },
        {
          heading: "14. Children",
          blocks: [
            "FINAZZA is not intended for anyone under [18] years of age [or the age of majority in their jurisdiction, if higher], and we do not knowingly collect personal information from them. If you believe a minor has created an account, contact us and we will delete it.",
          ],
        },
        {
          heading: "15. Changes to this Policy",
          blocks: [
            'We may update this Privacy Policy from time to time. If we make material changes, we will notify you through the Service or by email before they take effect. The "Last updated" date above shows when it was last changed.',
          ],
        },
        {
          heading: "16. Contact us",
          blocks: ["[COMPANY LEGAL NAME]", "[REGISTERED ADDRESS]", "Email: [PRIVACY CONTACT EMAIL]"],
        },
      ]}
    />
  );
}
