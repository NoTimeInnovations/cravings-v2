import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface OtpEmailProps {
  code: string;
  appName?: string;
  logoUrl?: string;
}

export const OtpEmail = ({
  code,
  appName = "Menuthere",
  logoUrl,
}: OtpEmailProps) => (
  <Html>
    <Head />
    <Preview>Your verification code is {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          {logoUrl ? (
            <img src={logoUrl} alt="Menuthere" style={logoImage} />
          ) : (
            <Text style={logo}>Menuthere</Text>
          )}
        </Section>
        <Section style={content}>
          <Heading style={h1}>Verify your email</Heading>
          <Text style={text}>
            Enter the following code to verify your email address and complete
            your signup on <strong>{appName}</strong>.
          </Text>
          <Section style={codeBox}>
            <Text style={codeText}>{code}</Text>
          </Section>
          <Text style={text}>This code expires in 5 minutes.</Text>
          <Text style={text}>
            If you didn't request this code, you can safely ignore this email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            © {new Date().getFullYear()} Menuthere. All rights reserved.
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
  padding: "20px 0 48px",
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
  maxWidth: "600px",
  overflow: "hidden" as const,
};

const header = {
  padding: "32px",
  textAlign: "center" as const,
  backgroundColor: "#ffffff",
};

const logo = {
  fontSize: "32px",
  fontWeight: "800",
  color: "#ea580c",
  letterSpacing: "-1px",
};

const logoImage = {
  height: "50px",
  width: "auto",
  display: "block",
  margin: "0 auto",
};

const content = {
  padding: "0 40px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "26px",
  fontWeight: "700",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const text = {
  color: "#4a4a4a",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
  textAlign: "center" as const,
};

const codeBox = {
  backgroundColor: "#fff7ed",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #ffedd5",
  textAlign: "center" as const,
};

const codeText = {
  color: "#ea580c",
  fontSize: "36px",
  fontWeight: "700",
  letterSpacing: "8px",
  fontFamily: "monospace",
  margin: 0,
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "40px 0 24px",
};

const footer = {
  color: "#9ca3af",
  fontSize: "13px",
  lineHeight: "20px",
  textAlign: "center" as const,
};

export default OtpEmail;
