import type { LegalPartnerInfo } from "@/lib/legalInfo";
import {
  getDisplayLegalName,
  getContactEmail,
  getContactPhone,
  getJurisdiction,
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
  const jurisdiction = getJurisdiction(partner);
  return (
    <>
      <Section title="Overview">
        <p>
          These Terms and Conditions, along with privacy policy or other terms
          (&ldquo;Terms&rdquo;) constitute a binding agreement by and between{" "}
          {name}, (&ldquo;Website Owner&rdquo; or &ldquo;we&rdquo; or
          &ldquo;us&rdquo; or &ldquo;our&rdquo;) and you (&ldquo;you&rdquo; or
          &ldquo;your&rdquo;) and relate to your use of our website, goods (as
          applicable) or services (as applicable) (collectively,
          &ldquo;Services&rdquo;).
        </p>
        <p>
          By using our website and availing the Services, you agree that you
          have read and accepted these Terms (including the Privacy Policy). We
          reserve the right to modify these Terms at any time and without
          assigning any reason. It is your responsibility to periodically
          review these Terms to stay informed of updates.
        </p>
      </Section>

      <Section title="Terms of Use">
        <p>The use of this website or availing of our Services is subject to the following terms of use:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            To access and use the Services, you agree to provide true, accurate
            and complete information to us during and after registration, and
            you shall be responsible for all acts done through the use of your
            registered account.
          </li>
          <li>
            Neither we nor any third parties provide any warranty or guarantee
            as to the accuracy, timeliness, performance, completeness or
            suitability of the information and materials offered on this
            website or through the Services, for any specific purpose. You
            acknowledge that such information and materials may contain
            inaccuracies or errors and we expressly exclude liability for any
            such inaccuracies or errors to the fullest extent permitted by law.
          </li>
          <li>
            Your use of our Services and the website is solely at your own
            risk and discretion. You are required to independently assess and
            ensure that the Services meet your requirements.
          </li>
          <li>
            The contents of the Website and the Services are proprietary to us
            and you will not have any authority to claim any intellectual
            property rights, title, or interest in its contents.
          </li>
          <li>
            You acknowledge that unauthorized use of the Website or the
            Services may lead to action against you as per these Terms or
            applicable laws.
          </li>
          <li>You agree to pay us the charges associated with availing the Services.</li>
          <li>
            You agree not to use the website and/or Services for any purpose
            that is unlawful, illegal or forbidden by these Terms, or Indian
            or local laws that might apply to you.
          </li>
          <li>
            You agree and acknowledge that website and the Services may
            contain links to other third party websites. On accessing these
            links, you will be governed by the terms of use, privacy policy
            and such other policies of such third party websites.
          </li>
          <li>
            You understand that upon initiating a transaction for availing the
            Services you are entering into a legally binding and enforceable
            contract with us for the Services.
          </li>
          <li>
            You shall be entitled to claim a refund of the payment made by you
            in case we are not able to provide the Service. The timelines for
            such return and refund will be according to the specific Service
            you have availed or within the time period provided in our
            policies (as applicable). In case you do not raise a refund claim
            within the stipulated time, then this would make you ineligible
            for a refund.
          </li>
          <li>
            Notwithstanding anything contained in these Terms, the parties
            shall not be liable for any failure to perform an obligation under
            these Terms if performance is prevented or delayed by a force
            majeure event.
          </li>
        </ul>
      </Section>

      <Section title="Governing Law & Jurisdiction">
        <p>
          These Terms and any dispute or claim relating to it, or its
          enforceability, shall be governed by and construed in accordance
          with the laws of India.
        </p>
        <p>
          All disputes arising out of or in connection with these Terms shall
          be subject to the exclusive jurisdiction of the courts in{" "}
          {jurisdiction}.
        </p>
      </Section>

      <Section title="Contact Us">
        <p>
          All concerns or communications relating to these Terms must be
          communicated to us using the contact information provided below:
        </p>
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
      <Section title="Overview">
        <p>
          {name} believes in helping its customers as far as possible, and has
          therefore a liberal cancellation policy. Under this policy:
        </p>
        <ul className="ml-5 list-disc space-y-3">
          <li>
            Cancellations will be considered only if the request is made
            immediately after placing the order. However, the cancellation
            request may not be entertained if the orders have been
            communicated to the vendors/merchants and they have initiated the
            process of shipping them.
          </li>
          <li>
            {name} does not accept cancellation requests for perishable items
            like flowers, eatables etc. However, refund/replacement can be
            made if the customer establishes that the quality of product
            delivered is not good.
          </li>
          <li>
            In case of receipt of damaged or defective items please report the
            same to our Customer Service team. The request will, however, be
            entertained once the merchant has checked and determined the same
            at his own end. This should be reported within the same day of
            receipt of the products. In case you feel that the product
            received is not as shown on the site or as per your expectations,
            you must bring it to the notice of our customer service within
            the same day of receiving the product. The Customer Service Team
            after looking into your complaint will take an appropriate
            decision.
          </li>
          <li>
            In case of complaints regarding products that come with a
            warranty from manufacturers, please refer the issue to them. In
            case of any Refunds approved by {name}, it will take 1&ndash;2
            days for the refund to be processed to the end customer.
          </li>
        </ul>
      </Section>

      <Section title="Contact for Cancellation or Refund">
        <p>
          For any cancellation or refund concerns, please contact us promptly
          using the details below:
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
