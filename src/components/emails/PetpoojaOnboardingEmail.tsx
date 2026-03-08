import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface PetpoojaOnboardingEmailProps {
  restaurantName: string;
  restaurantId: string;
  menuMapping: string;
  senderName: string;
  senderOrg: string;
}

export const PetpoojaOnboardingEmail = ({
  restaurantName = "Restaurant",
  restaurantId = "",
  menuMapping = "Online",
  senderName = "Thrisha K",
  senderOrg = "Notime Services (Cravings)",
}: PetpoojaOnboardingEmailProps) => (
  <Html>
    <Head />
    <Preview>
      New Restaurant Onboarding Of {restaurantName} - Petpooja
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={subjectSection}>
          <Text style={subjectText}>
            New Restaurant Onboarding Of {restaurantName} - Petpooja
          </Text>
        </Section>
        <Hr style={hr} />
        <Section style={content}>
          <Text style={text}>Dear Petpooja Team,</Text>
          <Text style={text}>
            We would like to initiate the integration process for{" "}
            <strong>{restaurantName}</strong> (Restaurant ID:{" "}
            <strong>{restaurantId}</strong>) with our platform,{" "}
            <strong>Cravings.</strong>
          </Text>
          <Text style={text}>
            <strong>Merchant Approval:</strong> [{restaurantName} Owner], could
            you please reply to this email thread with your formal approval for
            this integration? This is required by the Petpooja team to proceed
            with the configuration.
          </Text>
          <Text style={sectionTitle}>Integration Details:</Text>
          <ul style={listStyle}>
            <li style={listItem}>
              <strong>Platform Name:</strong> Cravings
            </li>
            <li style={listItem}>
              <strong>Restaurant ID:</strong> {restaurantId}
            </li>
            <li style={listItem}>
              <strong>Menu Mapping:</strong> Please use the{" "}
              <strong>[{menuMapping}]</strong> menu version for the Cravings
              configuration.
            </li>
          </ul>
          <Text style={text}>
            Petpooja Team, once we have the merchant&apos;s confirmation, please
            provide the necessary mapping codes so we can proceed with the
            technical setup.
          </Text>
          <Text style={text}>
            Please let us know if any further information is required.
          </Text>
          <Text style={text}>Best regards,</Text>
          <Text style={signatureText}>
            <span style={{ textDecoration: "underline" }}>{senderName}</span>
            <br />
            {senderOrg}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  borderRadius: "4px",
  maxWidth: "600px",
  overflow: "hidden" as const,
};

const subjectSection = {
  padding: "16px 24px",
  backgroundColor: "#f8f9fa",
};

const subjectText = {
  color: "#1a4d8f",
  fontSize: "15px",
  fontWeight: "500",
  margin: 0,
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "0",
};

const content = {
  padding: "24px",
};

const text = {
  color: "#333333",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "12px 0",
};

const sectionTitle = {
  color: "#333333",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "24px",
  margin: "16px 0 8px",
};

const listStyle = {
  paddingLeft: "24px",
  margin: "8px 0 16px",
};

const listItem = {
  color: "#333333",
  fontSize: "14px",
  lineHeight: "28px",
};

const signatureText = {
  color: "#333333",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "4px 0",
};

export default PetpoojaOnboardingEmail;
