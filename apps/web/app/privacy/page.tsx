import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = { title: "Privacy Policy · FINAZZA" };

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      meta="Effective date: 30 October 2026 • Last updated: 30 October 2026"
      otherHref="/terms"
      otherLabel="Terms of Use"
      sections={[
        {
          heading: "1. Who we are",
          blocks: [
            'FINAZZA (the "Platform") is an investment-focused social network operated by Tse Wai Kin (also known as Winson Tse), an individual based in Hong Kong ("FINAZZA", "we", "us" or "our").',
            'This Privacy Policy explains what personal information we collect when you use the FINAZZA website and web application at finazza.app (together, the "Service"), how we use and share it, and the choices and rights you have. If you have any questions, contact us at w@finazza.app.',
            'For the purposes of the Personal Data (Privacy) Ordinance (Cap. 486) of Hong Kong (the "PDPO"), FINAZZA is the data user responsible for your personal data. For users in the European Economic Area ("EEA") and the United Kingdom, FINAZZA is the controller of your personal data under the EU General Data Protection Regulation and the UK GDPR (together, "GDPR").',
          ],
        },
        {
          heading: "2. The most important thing to know: much of FINAZZA is public",
          blocks: [
            "FINAZZA is built around public sharing. Unless a feature is described as private, assume that what you post can be seen by anyone, including people who are not logged in and search engines. In particular:",
            {
              bullets: [
                "Public by design: your profile (username, display name, avatar, header image, bio, follower and following counts), your posts, replies and reposts, your past trades and current holdings, any proof of investment you upload, annotated charts you post, and messages you send in public topic rooms.",
                "Visible to selected people: messages in one-to-one direct messages are visible to you and the other participant. Messages in group chats are visible to all current and future members of that group (up to 50 members), including members who join after the message was sent.",
                "Not end-to-end encrypted: direct messages and group chats are stored on our servers and are not end-to-end encrypted. Our authorised staff may access them in the limited situations described in section 7.",
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
                "Reports and moderation: reports you submit about posts, messages, investment records, proof or users, including the reason you give, and any appeal you make.",
                "Settings and preferences: notification preferences, who may message you or add you to group chats (everyone or followers only), your lists of muted and blocked users, and your cookie choices.",
                "Communications with us: support requests, feedback and any other information you send us.",
              ],
            },
            "3.2 Information we collect automatically",
            {
              bullets: [
                "Log and device information: IP address, browser type and version, device type, operating system, referring pages, and the date and time of requests.",
                "Usage information: pages and features you use, actions you take (such as posting, liking or joining a room), unread counts and read status of notifications and messages, and connection events for real-time chat.",
                "Cookie and advertising identifiers: cookie IDs and similar identifiers set by us and by our analytics and advertising partners, and information about how you interact with our pages and with our ads. See section 10.",
              ],
            },
            "File metadata: when you upload an image or document, we strip embedded metadata (such as EXIF data, which can include location and device details) before storing or displaying it. Visible content inside the file itself is not removed, so please redact it yourself.",
            "3.3 Information from other people and partners",
            "Other users may give us information about you, for example when they @mention you, reply to you, invite you to a group chat, send you a message or report your content or account. Our analytics and advertising partners may also give us information, such as whether you visited FINAZZA after seeing one of our ads.",
            "3.4 Information we do not collect",
            "FINAZZA does not connect to your brokerage, bank or wallet, does not collect your login credentials for those services, does not process payments, and does not verify investment records or proof. We do not ask for special categories of personal data (such as health, religion or ethnic origin), and we ask you not to share them on the Service.",
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
                "Send service emails: account confirmation, password reset, security alerts and important changes to the Service or these policies.",
                "Measure and improve the Service: understand how features are used, fix bugs and develop new features (such as mobile apps), using analytics tools.",
                "Advertising: measure how well our advertising works and, where you have agreed or where the law allows, show you more relevant ads for FINAZZA on other websites and ads on the Service, using cookies and similar technologies (see section 10).",
                "Keep the Platform safe: enforce our Terms of Use, apply rate limits and word filters, detect spam, abuse, fake or misleading proof and market manipulation, review reports, and take action such as removing content or suspending accounts.",
                "Secure the Service: authenticate you, prevent fraud and unauthorised access, validate and scan uploaded files, and investigate security incidents.",
                "Comply with law: meet legal, regulatory and law-enforcement obligations, and establish, exercise or defend legal claims.",
              ],
            },
            "We do not use the content of your direct messages or group chats, or your proof files, for advertising. We will not use your personal data for direct marketing (such as promotional emails) unless you have given your consent, and you can withdraw that consent at any time.",
          ],
        },
        {
          heading: "5. Hong Kong law (PDPO)",
          blocks: [
            "We collect and use personal data in line with the PDPO and its Data Protection Principles. The purposes for which we collect your data are set out in section 4, and the classes of persons to whom it may be transferred are set out in section 8. Providing your account information is required to use the Service; if you do not provide it, we cannot create your account. All other information is optional.",
          ],
        },
        {
          heading: "6. Legal bases (EEA and UK users)",
          blocks: [
            "If GDPR applies to you, we rely on the following legal bases:",
            {
              bullets: [
                "Contract: to provide the Service you signed up for, including your profile, posts, investment records, proof, messaging and notifications.",
                "Legitimate interests: to keep the Platform safe and secure, moderate content, prevent abuse, understand basic use of the Service, and communicate with you about it. We balance these interests against your rights, and you can object (see section 12).",
                "Consent: for analytics and advertising cookies and similar technologies, and for any marketing emails. You can withdraw consent at any time through our cookie settings or by contacting us, without affecting processing that took place before.",
                "Legal obligation: where the law requires us to process or retain information.",
              ],
            },
            'Financial details in investment records and proof are not "special category" data under GDPR, but we treat them with care. You choose to make them public, and you can delete them at any time.',
          ],
        },
        {
          heading: "7. Moderation, reporting and access to messages",
          blocks: [
            "To keep FINAZZA safe, we operate reporting and moderation tools:",
            {
              bullets: [
                "Reports: you can report posts, messages, investment records, proof files and users. We store the report, the reported content and the outcome. We do not tell the reported user who reported them, unless the law requires us to.",
                "Who reviews: reports are reviewed by FINAZZA's authorised staff. Staff can view reported content and the surrounding context.",
                "Access to private messages: we do not routinely read direct messages or group chats. Authorised staff may access them when a participant reports a message or conversation, when automated filters flag content, when needed to investigate a security incident or a breach of our Terms of Use, or when required by law.",
                "Actions we may take: remove or hide content, add labels, restrict features, suspend or terminate accounts, and in serious cases preserve information and refer it to law enforcement or regulators.",
                "Automated tools: we use automated rate limits and basic word filtering. These may temporarily block or hold content, but decisions to suspend or terminate an account are made by a member of staff. We do not make decisions about you based solely on automated processing that have legal or similarly significant effects.",
                "Notifications and appeals: you may receive a notification about the outcome of a report you made or an action taken on your content, and you can appeal as described in our Terms of Use.",
              ],
            },
          ],
        },
        {
          heading: "8. How we share information",
          blocks: [
            {
              bullets: [
                "With the public and other users: as described in section 2. Blocked users cannot send you direct messages, add you to group chats or generate notifications for you, but they may still be able to see your public content.",
                "Service providers: companies that host and operate the Service for us under contract, including cloud hosting, database, file storage and content delivery, real-time messaging infrastructure, email delivery, security and monitoring providers. They may only use your information to provide services to us.",
                "Analytics and advertising partners: with your consent where required, we share cookie and device identifiers, IP address, and information about pages viewed and actions taken on the Service with analytics and advertising partners, to measure use of the Service and to measure and personalise advertising. Some of these partners may combine this with information they collect elsewhere and use it for their own purposes under their own privacy policies. We do not share your messages, proof files, email address or password with advertising partners.",
                "Legal and safety reasons: to comply with law, a court order or a lawful request from authorities; to enforce our Terms; or to protect the rights, property or safety of FINAZZA, our users or the public, including by reporting suspected fraud or market abuse.",
                "Business transfers: if FINAZZA is transferred to a company (including a company set up by its operator), or in connection with a merger, acquisition, financing or sale of assets, your information may be transferred, subject to this Policy.",
                "With your consent or at your direction.",
              ],
            },
            "We may share aggregated or de-identified information that cannot reasonably identify you.",
          ],
        },
        {
          heading: "9. Retention",
          blocks: [
            "We keep personal information for as long as your account is active and as needed to provide the Service, and then as follows:",
            {
              bullets: [
                "Content you delete (posts, investment records, proof files, annotated charts and messages) is removed from the Service promptly and deleted from our backups within 30 days.",
                'When you delete your account, we delete or anonymise your profile, posts, investment records and proof within 30 days. Messages you sent in direct messages and group chats are kept so that the conversation still makes sense for the other participants, and are shown as sent by "Deleted user" without your username or profile.',
                "Reports and moderation records are kept for 2 years after the case is closed, to handle appeals and prevent repeat abuse.",
                "Security and server logs are kept for 90 days.",
                "Analytics and advertising data is kept for no longer than 14 months.",
                "We may keep information longer where the law requires it or to resolve disputes and enforce our agreements.",
              ],
            },
            "Content that was public may have been copied, shared or indexed by others before you deleted it, and we cannot control those copies.",
          ],
        },
        {
          heading: "10. Cookies and similar technologies",
          blocks: [
            "We use the following types of cookies and similar technologies (such as pixels and local storage):",
            {
              bullets: [
                "Strictly necessary: to sign you in, keep your session secure, prevent abuse and remember your settings. These cannot be switched off.",
                "Analytics: to understand how people use the Service, such as which pages are visited and which features are used, so we can improve it.",
                "Advertising: set by us and our advertising partners to measure the performance of our ads, to show you ads for FINAZZA on other websites, and to make ads on the Service more relevant to you.",
              ],
            },
            "Where the law requires it (including in the EEA and the UK), we only use analytics and advertising cookies after you agree through our cookie banner. You can change your choices at any time in Cookie settings, linked at the bottom of every page, and you can also block or delete cookies in your browser settings. Blocking strictly necessary cookies may stop the Service from working.",
          ],
        },
        {
          heading: "11. Your choices and controls",
          blocks: [
            {
              bullets: [
                "Edit or delete your profile, posts, investment records, proof files and annotated charts at any time.",
                "Control messaging: choose whether everyone or only followers can message you or add you to group chats; leave any group chat; mute or block users.",
                "Notifications: turn notification types on or off in your settings, and mark items as read.",
                'Cookies and ads: change your choices in Cookie settings. US users can also use the "Do Not Sell or Share My Personal Information" link (see section 13).',
                "Delete your account from your settings or by emailing w@finazza.app.",
              ],
            },
          ],
        },
        {
          heading: "12. Your rights",
          blocks: [
            "Hong Kong. Under the PDPO, you have the right to ask whether we hold personal data about you, to request a copy of it (a data access request), and to request correction of data that is inaccurate. We will respond within 40 days, and we may charge a fee that is not excessive for a data access request. You may complain to the Office of the Privacy Commissioner for Personal Data, Hong Kong (www.pcpd.org.hk).",
            "EEA and UK. If GDPR applies to you, you have the right to access, correct or delete your personal data; to receive a copy of it in a portable format; to restrict or object to our processing (including processing based on legitimate interests and any processing for direct marketing); and to withdraw consent at any time. You also have the right to complain to your local data protection authority, or in the UK to the Information Commissioner's Office (ico.org.uk).",
            "To exercise any of your rights, email w@finazza.app. We may need to verify your identity before responding. We will respond within the time required by the law that applies to you. We will not discriminate against you for exercising your rights.",
          ],
        },
        {
          heading: "13. Notice for United States residents",
          blocks: [
            "This section applies to residents of California and other US states with comprehensive privacy laws.",
            {
              bullets: [
                "Categories we collect: identifiers (such as email address, username, IP address and cookie IDs); personal records (such as profile details); commercial information (investment records and proof you choose to enter); internet or other electronic network activity (usage and log information); approximate location inferred from IP address; content of communications (posts and messages); and inferences drawn from your use of the Service. Sources, purposes and recipients are described in sections 3, 4 and 8, and retention in section 9.",
                'Sale and sharing: we do not sell personal information for money. However, our use of advertising cookies and similar technologies may count as "selling" or "sharing" personal information for cross-context behavioural advertising under some state laws. You can opt out using the "Do Not Sell or Share My Personal Information" link at the bottom of every page, through Cookie settings, or by enabling the Global Privacy Control signal in your browser, which we honour. We do not knowingly sell or share the personal information of anyone under 16.',
                "Sensitive information: we do not use or disclose sensitive personal information for purposes other than providing the Service and keeping it secure.",
                "Your rights: subject to applicable law, you have the right to know what personal information we have collected about you, to access it, to correct it, to delete it, and to opt out of its sale or sharing. You can make a request by emailing w@finazza.app, or you can use an authorised agent. If we deny your request, you may appeal by replying to our response. We will not discriminate against you for exercising these rights.",
              ],
            },
          ],
        },
        {
          heading: "14. Security",
          blocks: [
            "We use reasonable technical and organisational measures to protect your information, including encrypted connections (HTTPS), hashed passwords, access controls, server-side validation, file-type and size restrictions, metadata stripping and, where feasible, file scanning. No system is completely secure. Please use a strong, unique password and tell us promptly at w@finazza.app if you believe your account has been compromised. If a data breach is likely to put your rights at risk, we will notify you and the relevant authorities where the law requires.",
          ],
        },
        {
          heading: "15. International transfers",
          blocks: [
            "FINAZZA is operated from Hong Kong, and our service providers process information in the United States and other countries where they or their sub-processors operate. These countries may have data protection laws that differ from those where you live. We take reasonable steps to protect your data wherever it is processed, including contractual commitments from our service providers. Where we transfer personal data from the EEA or the UK to a country that has not been found to provide adequate protection, we use appropriate safeguards such as the European Commission's Standard Contractual Clauses and the UK International Data Transfer Addendum. You can ask us for more information at w@finazza.app.",
          ],
        },
        {
          heading: "16. Children",
          blocks: [
            "FINAZZA is not intended for anyone under 18 years of age, or the age of majority where they live if that is higher, and we do not knowingly collect personal information from them. If you believe a minor has created an account, contact us and we will delete it.",
          ],
        },
        {
          heading: "17. Changes to this Policy",
          blocks: [
            'We may update this Privacy Policy from time to time. If we make material changes, we will notify you through the Service or by email before they take effect. The "Last updated" date above shows when it was last changed.',
          ],
        },
        {
          heading: "18. Contact us",
          blocks: ["FINAZZA (operated by Tse Wai Kin, Hong Kong)", "Email: w@finazza.app"],
        },
      ]}
    />
  );
}
