import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = { title: "Terms of Use · FINAZZA" };

const notice =
  "DRAFT FOR LEGAL REVIEW. This draft was prepared from the FINAZZA product roadmap (October 2026) and is not legal advice. Items in [SQUARE BRACKETS] are placeholders. A qualified lawyer in [JURISDICTION] should review and adapt it before publication, in particular the investment disclaimer, limitation of liability, dispute resolution and any securities or financial-promotion rules that apply to an investment community.";

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Use"
      meta="Effective date: [EFFECTIVE DATE] • Last updated: [LAST UPDATED DATE]"
      notice={notice}
      otherHref="/privacy"
      otherLabel="Privacy Policy"
      sections={[
        {
          heading: "1. Agreement to these Terms",
          blocks: [
            'These Terms of Use ("Terms") are an agreement between you and [COMPANY LEGAL NAME], a company registered in [JURISDICTION] with its registered office at [REGISTERED ADDRESS] ("FINAZZA", "we", "us" or "our"). They govern your use of the FINAZZA website, web application and related services (the "Service").',
            "By creating an account or using the Service, you agree to these Terms and to our Community Rules (section 9). Our Privacy Policy explains how we handle your personal information. If you do not agree, do not use the Service.",
          ],
        },
        {
          heading: "2. Not investment advice",
          blocks: [
            "IMPORTANT. FINAZZA is a social network, not a broker, dealer, investment adviser, financial planner or exchange. Nothing on the Service is financial, investment, tax, legal or other professional advice, or a recommendation or offer to buy, sell or hold any asset.",
            {
              bullets: [
                "Content is user opinion. Posts, comments, chat messages, investment records, returns, proof, annotated charts and profiles are created by users. They reflect the personal views and experience of those users, not FINAZZA. We do not endorse any user, strategy or asset.",
                'Records are not verified. Trades, holdings, prices, returns and proof of investment are entered and uploaded by users. FINAZZA does not verify them. Proof is labelled "Proof uploaded — not verified by the platform". A record may be inaccurate, incomplete, out of date or fake.',
                "Returns are simple calculations. Any return shown is calculated only from the values a user entered (for example buy and sale price), is gross, and does not account for fees, taxes, currency movements, partial sales or other costs. Current holdings do not show realised returns.",
                "Past performance does not predict future results. Investing involves risk, including the loss of all of your capital. Commodities and collectibles can be illiquid, hard to value and subject to fraud, counterfeiting and storage risks.",
                "Do your own research. You are solely responsible for your investment decisions. Consider getting independent advice from a licensed professional who knows your circumstances.",
                "No market data. The Service does not provide live or delayed market data. Chart images are uploaded by users and may be inaccurate or out of date.",
              ],
            },
          ],
        },
        {
          heading: "3. Eligibility",
          blocks: [
            "You must be at least [18] years old [or the age of majority where you live, if higher] and able to form a binding contract to use the Service. You may not use the Service if we have previously suspended or banned you, or if the law prohibits you from doing so. If you use the Service on behalf of an organisation, you confirm you have authority to bind it to these Terms.",
          ],
        },
        {
          heading: "4. Your account",
          blocks: [
            {
              bullets: [
                "Provide accurate information when you sign up and keep it up to date.",
                "Keep your password secure and do not share your account. You are responsible for activity on your account.",
                "Tell us promptly at [SUPPORT CONTACT EMAIL] if you suspect unauthorised use.",
                "Usernames must not impersonate others or infringe anyone's rights. We may reclaim or change a username that breaches these Terms.",
              ],
            },
          ],
        },
        {
          heading: "5. The Service",
          blocks: [
            "FINAZZA lets you publish posts and follow other members in an X.com-style feed; build a profile with past trades and current holdings for stocks, ETFs, commodities, collectibles and other assets; upload proof of investment; chat in public topic rooms, one-to-one direct messages and private group chats; receive in-app notifications; and, where available, annotate uploaded chart images.",
            'We may add, change, suspend or remove features (for example adding mobile apps or changing limits such as the maximum group size) at any time. We will try to give notice of material changes that adversely affect you. The Service is provided on an "as available" basis and may sometimes be unavailable.',
          ],
        },
        {
          heading: "6. Investment records and proof of investment",
          blocks: [
            "When you add an investment record or upload proof, you agree that:",
            {
              bullets: [
                "It is truthful. The record reflects a real transaction or holding of yours, to the best of your knowledge. Do not fabricate, alter or exaggerate records or proof.",
                "It is your own. You only upload proof relating to your own investments, or that you have the right to share.",
                "You have redacted it. Before uploading, you remove real names, account numbers, addresses, signatures and other sensitive information about you or anyone else. You confirm this when you upload. FINAZZA does not review proof before it is published.",
                "It is public. Investment records and proof are visible to everyone, including people who are not logged in.",
                'No verification claims. You will not describe your records as "verified" by FINAZZA or suggest that FINAZZA has checked, endorsed or guaranteed them.',
              ],
            },
            "We may remove records or proof, add labels, or suspend accounts if we believe content is fake, misleading or harmful, but we have no obligation to do so and we do not guarantee that any record on the Service is accurate.",
          ],
        },
        {
          heading: "7. Chatrooms, direct messages and group chats",
          blocks: [
            {
              bullets: [
                "Topic rooms are public rooms created by FINAZZA administrators. Messages in topic rooms may be seen by anyone with access to the room. Each room may have its own rules, which form part of these Terms.",
                "Direct messages are private conversations between two users. Group chats are private groups created by a user, with up to [50] members. The group creator can name the group, invite members and remove members; any member can leave at any time.",
                "You may choose whether everyone or only your followers can message you or add you to groups, and you can mute or block other users. Blocked users cannot message you or add you to group chats.",
                "Private conversations are not end-to-end encrypted. Other participants can screenshot or share what you send. We may review messages that are reported or flagged, or where required for safety, security or legal reasons, as described in our Privacy Policy.",
                "Do not use chat to solicit investments, run paid signal groups or coordinate trading activity in breach of section 9.",
              ],
            },
          ],
        },
        {
          heading: "8. Your content",
          blocks: [
            'Ownership. You keep ownership of the content you post, upload or send, including posts, images, investment records, proof, annotated charts and messages ("Your Content").',
            "Licence to FINAZZA. You grant FINAZZA a worldwide, non-exclusive, royalty-free, sublicensable and transferable licence to host, store, copy, process, adapt (for example resizing images or stripping metadata), display, publish and distribute Your Content for the purposes of operating, providing, securing, promoting and improving the Service. For public content, this licence lets us display it to anyone. The licence ends when you delete Your Content or your account, except for content others have shared or reposted, content kept in backups for a limited period, and content we must keep for legal or moderation purposes.",
            "Your responsibility. You are responsible for Your Content and confirm you have all rights needed to share it, including rights to any chart images or screenshots you upload to the chart annotator (screenshots of third-party charting tools or paid data may be protected by copyright or licence terms).",
            "Removal. We may remove or restrict access to any content at our discretion, including content that breaches these Terms or the law.",
          ],
        },
        {
          heading: "9. Community Rules",
          blocks: [
            "You must not use the Service to:",
            {
              bullets: [
                'Manipulate markets: promote "pump and dump" or similar schemes, spread false or misleading information to influence prices, coordinate trading to move a price, or trade against recommendations you make without disclosure.',
                "Post fake or misleading records: fabricate or alter trades, holdings, returns or proof, or post someone else's proof as your own.",
                "Give undisclosed paid promotion: promote an asset, company, product or service in return for payment or other benefit without clearly disclosing it. If you are compensated, hold a position you are discussing, or are a licensed professional, follow applicable disclosure rules.",
                "Offer regulated services without authorisation: offer investment advice, portfolio management, signal services or investment opportunities for compensation where a licence is required and you do not hold one; or solicit money or deposits from other users.",
                "Defraud others: run scams, phishing, Ponzi or pyramid schemes, fake giveaways or counterfeit collectible sales.",
                "Impersonate: pretend to be another person, company, financial professional or FINAZZA staff.",
                "Harass or harm: bully, threaten, harass, or post hateful, violent, sexually explicit or illegal content.",
                "Expose others: share another person's private information (such as names, addresses or account numbers appearing on receipts) without permission.",
                "Spam: send unsolicited bulk messages, add people to group chats against their wishes, or artificially inflate likes, reposts or followers.",
                "Infringe rights: post content that infringes copyright, trademark, privacy or other rights.",
                "Attack the Service: upload malware, attempt to access accounts or data without permission, bypass rate limits or security measures, or interfere with the Service.",
                "Scrape or misuse data: use bots, scrapers or other automated means to access or collect data from the Service without our written permission, or use data from the Service to train models or build competing datasets [confirm].",
                "Break the law: violate any applicable law, including securities, consumer protection, sanctions and data protection laws.",
              ],
            },
          ],
        },
        {
          heading: "10. Reporting, moderation and enforcement",
          blocks: [
            {
              bullets: [
                "Report it. Use the report button on posts, messages, investment records, proof and profiles, or contact [SUPPORT CONTACT EMAIL]. Reports are reviewed by our authorised staff or moderators.",
                "What we may do. If we believe you have breached these Terms, we may remove or hide content, add labels, limit features, remove you from topic rooms, suspend or permanently terminate your account, and preserve information or report it to law enforcement or regulators. We may act without notice where needed to protect users or the Service.",
                "Notice and appeal. Where reasonably possible, we will tell you about action taken on your content or account. If you think we made a mistake, you can appeal by contacting [APPEALS CONTACT EMAIL] within [30] days. [Lawyer to confirm requirements under applicable online-safety laws, such as the EU Digital Services Act or UK Online Safety Act, if they apply.]",
                "No duty to monitor. We do not review all content before it is published and are not responsible for user content, but we may review content at any time.",
              ],
            },
          ],
        },
        {
          heading: "11. Intellectual property complaints",
          blocks: [
            "If you believe content on the Service infringes your copyright or other intellectual property, send a notice to [IP/COPYRIGHT CONTACT EMAIL] including: your contact details; a description of the work; the location (URL) of the infringing content; a statement that you have a good-faith belief the use is not authorised; and a statement, under penalty of perjury, that the information is accurate and you are authorised to act. [Adapt to the DMCA or local notice-and-takedown rules and designate an agent if required.] We may terminate accounts of repeat infringers.",
          ],
        },
        {
          heading: "12. FINAZZA's rights",
          blocks: [
            "The Service, including its software, design, the FINAZZA name and logo, and all content we provide (excluding user content), is owned by FINAZZA or its licensors and protected by law. We grant you a limited, personal, non-exclusive, non-transferable, revocable licence to use the Service in line with these Terms. You may not copy, modify, reverse engineer or use our trademarks without our written permission. If you send us feedback or ideas, we may use them without obligation to you.",
          ],
        },
        {
          heading: "13. Third-party links and services",
          blocks: [
            "The Service may contain links to third-party websites or content. We do not control and are not responsible for them, and your use of them is at your own risk and subject to their terms.",
          ],
        },
        {
          heading: "14. Ending your use of the Service",
          blocks: [
            "You can stop using the Service and delete your account at any time in your settings. We may suspend or terminate your access as described in section 10, or if we stop offering the Service. Sections that by their nature should survive (including sections 2, 8, 12, and 15 to 19) continue after termination.",
          ],
        },
        {
          heading: "15. Disclaimers",
          blocks: [
            'To the maximum extent permitted by law, the Service and all content are provided "as is" and "as available", without warranties of any kind, express or implied, including warranties of accuracy, merchantability, fitness for a particular purpose, non-infringement, and that the Service will be uninterrupted, secure or error-free. We do not warrant the accuracy, completeness or reliability of any user content, investment record, return calculation, proof or chart. Nothing in these Terms excludes rights you have under consumer protection laws that cannot be excluded.',
          ],
        },
        {
          heading: "16. Limitation of liability",
          blocks: [
            "To the maximum extent permitted by law:",
            {
              bullets: [
                "FINAZZA will not be liable for any indirect, incidental, special, consequential, exemplary or punitive damages, or for any loss of profits, revenue, investments, data or goodwill.",
                "FINAZZA is not liable for any investment losses or decisions you make based on content on the Service, or for the conduct of any user, on or off the Service.",
                "Our total liability for all claims relating to the Service is limited to the greater of [AMOUNT, e.g. USD 100] and the amount you paid us in the 12 months before the claim.",
              ],
            },
            "Nothing in these Terms limits liability that cannot be limited by law, such as liability for death or personal injury caused by negligence, or for fraud. [Lawyer to adapt for consumer-law requirements in the target markets.]",
          ],
        },
        {
          heading: "17. Indemnity",
          blocks: [
            "To the extent permitted by law, you agree to indemnify and hold harmless FINAZZA and its officers, employees and agents from claims, losses and expenses (including reasonable legal fees) arising from Your Content, your use of the Service, or your breach of these Terms or the law.",
          ],
        },
        {
          heading: "18. Governing law and disputes",
          blocks: [
            "These Terms are governed by the laws of [GOVERNING LAW JURISDICTION]. Disputes will be resolved in the courts of [VENUE], [or by binding arbitration under [ARBITRATION RULES], with a class-action waiver, where enforceable] [lawyer to decide]. Before starting formal proceedings, please contact us at [LEGAL CONTACT EMAIL] so we can try to resolve the issue informally. If you are a consumer, you may also have the right to bring proceedings in the courts where you live.",
          ],
        },
        {
          heading: "19. Changes to these Terms",
          blocks: [
            "We may update these Terms from time to time. If we make material changes, we will notify you through the Service or by email at least [14] days before they take effect, unless a change is needed sooner for legal or safety reasons. If you continue using the Service after changes take effect, you accept the updated Terms.",
          ],
        },
        {
          heading: "20. General",
          blocks: [
            "These Terms, together with the Privacy Policy and any room rules, are the entire agreement between you and FINAZZA about the Service. If any provision is found unenforceable, the rest remains in effect. Our failure to enforce a provision is not a waiver. You may not transfer your rights under these Terms; we may transfer ours in connection with a merger, acquisition or sale of assets. [If the Terms are published in several languages, state which version prevails.]",
          ],
        },
        {
          heading: "21. Contact us",
          blocks: ["[COMPANY LEGAL NAME]", "[REGISTERED ADDRESS]", "Email: [SUPPORT CONTACT EMAIL]"],
        },
      ]}
    />
  );
}
