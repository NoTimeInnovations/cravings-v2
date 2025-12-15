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

interface SupportEmailProps {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export const SupportEmail = ({
    name,
    email,
    subject,
    message,
}: SupportEmailProps) => (
    <Html>
        <Head />
        <Preview>New Support Request: {subject}</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={header}>
                    <Text style={logo}>Cravings Support</Text>
                </Section>
                <Section style={content}>
                    <Heading style={h1}>New Support Request</Heading>
                    <Text style={text}>
                        <strong>From:</strong> {name} ({email})
                    </Text>
                    <Text style={text}>
                        <strong>Subject:</strong> {subject}
                    </Text>
                    <Hr style={hr} />
                    <Text style={label}>Message:</Text>
                    <Section style={messageBox}>
                        <Text style={messageText}>{message}</Text>
                    </Section>
                </Section>
                <Hr style={hr} />
                <Text style={footer}>
                    This email was sent via the Cravings support form.
                </Text>
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
    fontSize: "26px",
    fontWeight: "800",
    color: "#ea580c",
    letterSpacing: "-0.5px",
};

const content = {
    padding: "0 40px",
};

const h1 = {
    color: "#1a1a1a",
    fontSize: "24px",
    fontWeight: "700",
    textAlign: "left" as const,
    margin: "0 0 24px",
};

const text = {
    color: "#4a4a4a",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "12px 0",
};

const label = {
    color: "#1a1a1a",
    fontSize: "16px",
    fontWeight: "600",
    margin: "16px 0 8px",
};

const messageBox = {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "20px",
    margin: "16px 0",
};

const messageText = {
    color: "#374151",
    fontSize: "15px",
    lineHeight: "24px",
    whiteSpace: "pre-wrap" as const,
};

const hr = {
    borderColor: "#e5e7eb",
    margin: "32px 0",
};

const footer = {
    color: "#9ca3af",
    fontSize: "13px",
    lineHeight: "20px",
    textAlign: "center" as const,
    padding: "0 32px",
};

export default SupportEmail;
