import type { LegalPartnerInfo } from "@/lib/legalInfo";
import {
  getDisplayLegalName,
  getContactEmail,
  getContactPhone,
} from "@/lib/legalInfo";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Contact({ partner }: { partner: LegalPartnerInfo }) {
  const name = getDisplayLegalName(partner);
  const email = getContactEmail(partner);
  const phone = getContactPhone(partner);
  const address = partner.operating_address;

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="font-medium text-neutral-900">{name}</p>
      {address && <p className="mt-1 text-neutral-700">{address}</p>}
      {email && (
        <p className="mt-1 text-neutral-700">
          Email:{" "}
          <a
            href={`mailto:${email}`}
            className="font-medium text-neutral-900 underline-offset-2 hover:underline"
          >
            {email}
          </a>
        </p>
      )}
      {phone && (
        <p className="mt-1 text-neutral-700">
          Phone:{" "}
          <a
            href={`tel:${phone}`}
            className="font-medium text-neutral-900 underline-offset-2 hover:underline"
          >
            {phone}
          </a>
        </p>
      )}
    </div>
  );
}

export function TermsContent({ partner }: { partner: LegalPartnerInfo }) {
  const name = getDisplayLegalName(partner);
  return (
    <>
      <Section title="1. Acceptance of Terms">
        <p>
          These Terms and Conditions (&ldquo;Terms&rdquo;) govern your access to
          and use of the online ordering services offered by {name}{" "}
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By placing
          an order, browsing our menu, or otherwise using this website, you
          agree to be bound by these Terms. If you do not agree, please refrain
          from using our services.
        </p>
      </Section>

      <Section title="2. Services Offered">
        <p>
          {name} operates an online platform that allows customers to view our
          menu and place orders for food and beverages. All items, prices, and
          availability are listed in Indian Rupees (INR) and are subject to
          change without prior notice.
        </p>
      </Section>

      <Section title="3. Orders and Pricing">
        <p>
          By placing an order, you confirm that all information provided is
          accurate and complete. We reserve the right to refuse or cancel any
          order at our sole discretion, including in cases of suspected fraud,
          incorrect pricing, or unavailability of items. Final pricing,
          including applicable taxes and delivery charges (if any), will be
          displayed at checkout before payment.
        </p>
      </Section>

      <Section title="4. Payments">
        <p>
          Payments are processed through secure third-party payment gateways. By
          submitting payment information, you authorise us and our payment
          processor to charge the specified amount. We do not store your full
          card details on our servers.
        </p>
      </Section>

      <Section title="5. User Conduct">
        <p>
          You agree not to misuse the platform, including but not limited to
          attempting unauthorised access, interfering with the operation of the
          website, or submitting fraudulent orders. We reserve the right to
          suspend access for any user who violates these Terms.
        </p>
      </Section>

      <Section title="6. Intellectual Property">
        <p>
          All content on this website &mdash; including logos, images, menu
          descriptions, and design &mdash; is the property of {name} or its
          licensors and is protected by applicable intellectual property laws.
          You may not reproduce, distribute, or otherwise use this content
          without our written permission.
        </p>
      </Section>

      <Section title="7. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, {name} shall not be liable
          for any indirect, incidental, or consequential damages arising from
          your use of the platform or any orders placed through it. Our total
          liability for any claim shall not exceed the amount paid by you for
          the order giving rise to such claim.
        </p>
      </Section>

      <Section title="8. Changes to Terms">
        <p>
          We may revise these Terms from time to time. The most current version
          will always be posted on this page. Continued use of the platform
          after any changes constitutes your acceptance of the updated Terms.
        </p>
      </Section>

      <Section title="9. Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of India. Any disputes arising out of or in connection with
          these Terms shall be subject to the exclusive jurisdiction of the
          courts located in India.
        </p>
      </Section>

      <Section title="10. Contact Us">
        <p>If you have any questions about these Terms, please contact us:</p>
        <Contact partner={partner} />
      </Section>
    </>
  );
}

export function PrivacyContent({ partner }: { partner: LegalPartnerInfo }) {
  const name = getDisplayLegalName(partner);
  return (
    <>
      <Section title="1. Introduction">
        <p>
          {name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;)
          respects your privacy and is committed to protecting the personal
          information you share with us. This Privacy Policy explains what
          information we collect, how we use it, and the choices you have.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p>We may collect the following information when you use our services:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Name, phone number, and email address</li>
          <li>Delivery or pickup address (where applicable)</li>
          <li>Order details and preferences</li>
          <li>
            Payment information processed through our secure payment partner
            (we do not store full card details)
          </li>
          <li>
            Device and usage data such as browser type, IP address, and pages
            visited
          </li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Information">
        <p>Your information is used to:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Process and deliver your orders</li>
          <li>Communicate order status, confirmations, and receipts</li>
          <li>Improve our menu, services, and user experience</li>
          <li>Respond to enquiries and provide customer support</li>
          <li>Comply with legal and regulatory obligations</li>
        </ul>
      </Section>

      <Section title="4. Sharing of Information">
        <p>
          We do not sell your personal information. We may share limited
          information with trusted third parties strictly for the purposes of
          fulfilling your order &mdash; such as payment processors, delivery
          partners, and SMS or email service providers. These parties are
          required to handle your data securely and only for the purposes we
          specify.
        </p>
      </Section>

      <Section title="5. Cookies & Tracking">
        <p>
          Our website may use cookies and similar technologies to remember your
          preferences and improve your browsing experience. You can disable
          cookies through your browser settings, though some features may not
          function as intended.
        </p>
      </Section>

      <Section title="6. Data Security">
        <p>
          We implement reasonable technical and organisational measures to
          protect your information against unauthorised access, disclosure,
          alteration, or destruction. However, no method of transmission over
          the internet is fully secure, and we cannot guarantee absolute
          security.
        </p>
      </Section>

      <Section title="7. Your Rights">
        <p>
          You may request access, correction, or deletion of your personal
          information by contacting us using the details below. We will respond
          to legitimate requests within a reasonable timeframe and in
          accordance with applicable law.
        </p>
      </Section>

      <Section title="8. Children's Privacy">
        <p>
          Our services are not directed at children under the age of 13. We do
          not knowingly collect personal information from children. If you
          believe we may have collected such information, please contact us so
          we can take appropriate action.
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. The latest
          version will always be available on this page, with an updated
          revision date.
        </p>
      </Section>

      <Section title="10. Contact Us">
        <p>
          For any questions about this Privacy Policy or how your data is
          handled, please reach out:
        </p>
        <Contact partner={partner} />
      </Section>
    </>
  );
}

export function RefundContent({ partner }: { partner: LegalPartnerInfo }) {
  const name = getDisplayLegalName(partner);
  return (
    <>
      <Section title="1. Overview">
        <p>
          At {name}, we strive to ensure that every order meets your
          expectations. This policy outlines the conditions under which
          cancellations, refunds, and replacements are processed.
        </p>
      </Section>

      <Section title="2. Order Cancellation">
        <p>
          Orders may be cancelled by the customer only before the order has
          been confirmed for preparation. Once preparation has begun,
          cancellation requests cannot be accommodated as ingredients have
          already been allocated to your order.
        </p>
        <p>
          {name} reserves the right to cancel an order at any time due to
          unforeseen circumstances such as item unavailability, technical
          issues, or suspected fraudulent activity. In such cases, a full
          refund will be initiated.
        </p>
      </Section>

      <Section title="3. Refund Eligibility">
        <p>You may be eligible for a refund or replacement in cases such as:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>You received an item that was significantly different from what was ordered</li>
          <li>Your order was damaged or spilled during delivery</li>
          <li>An item from your order was missing</li>
          <li>An order you paid for was cancelled by us</li>
        </ul>
        <p>
          To raise a refund request, please contact us within 24 hours of
          receiving your order along with details and, where possible, photos
          supporting your claim.
        </p>
      </Section>

      <Section title="4. Non-Refundable Cases">
        <p>Refunds will not be processed in the following situations:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Customer is unavailable at the delivery address or refuses delivery</li>
          <li>Incorrect delivery address provided by the customer</li>
          <li>Change of mind after the order has been prepared or dispatched</li>
          <li>Personal taste preferences that are not a quality issue</li>
        </ul>
      </Section>

      <Section title="5. Refund Timeline">
        <p>
          Approved refunds are processed back to the original payment method
          within 5&ndash;7 business days. The exact time for the amount to
          reflect in your account may vary depending on your bank or payment
          provider.
        </p>
      </Section>

      <Section title="6. Contact for Refund Requests">
        <p>
          For any cancellation or refund concerns, please contact us promptly:
        </p>
        <Contact partner={partner} />
      </Section>
    </>
  );
}

export function ShippingContent({ partner }: { partner: LegalPartnerInfo }) {
  const name = getDisplayLegalName(partner);
  return (
    <>
      <Section title="1. Overview">
        <p>
          {name} offers takeaway and (where available) delivery for orders
          placed through our website. This policy outlines our delivery and
          pickup practices.
        </p>
      </Section>

      <Section title="2. Service Areas">
        <p>
          Delivery is available within select areas around our operating
          location. Serviceability for your address will be confirmed at the
          time of checkout. If your address falls outside our delivery range,
          you may still place an order for takeaway.
        </p>
      </Section>

      <Section title="3. Delivery Time">
        <p>
          Estimated preparation and delivery times are displayed at checkout
          and may vary based on factors such as order volume, distance,
          weather, and traffic conditions. While we make every effort to
          deliver within the estimated window, delays may occur in
          exceptional circumstances.
        </p>
      </Section>

      <Section title="4. Delivery Charges">
        <p>
          Applicable delivery charges (if any) are calculated based on
          distance and order value, and are clearly displayed before you
          confirm the order. All charges are inclusive of applicable taxes
          unless stated otherwise.
        </p>
      </Section>

      <Section title="5. Order Tracking">
        <p>
          Once your order is confirmed, you will receive updates on its status
          via the contact details provided at checkout. Please ensure that
          your contact information is accurate to receive timely notifications.
        </p>
      </Section>

      <Section title="6. Failed or Missed Delivery">
        <p>
          If our delivery partner is unable to reach you due to incorrect
          address details or unavailability at the delivery address, the order
          may be marked as delivery-failed. Re-delivery may incur additional
          charges, and refunds in such cases are governed by our Refund &amp;
          Cancellation Policy.
        </p>
      </Section>

      <Section title="7. Takeaway Orders">
        <p>
          Takeaway orders should be collected within the time window indicated
          on your order confirmation. Orders not collected within a reasonable
          time may not be eligible for a refund.
        </p>
      </Section>

      <Section title="8. Contact Us">
        <p>For any delivery or takeaway-related queries, please contact us:</p>
        <Contact partner={partner} />
      </Section>
    </>
  );
}
