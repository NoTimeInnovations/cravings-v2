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

interface CancelRequestEmailProps {
    partnerName: string;
    partnerId: string;
    partnerEmail: string;
    reason: string;
}

export const CancelRequestEmail = ({
    partnerName,
    partnerId,
    partnerEmail,
    reason,
}: CancelRequestEmailProps) => (
    <Html>
        <Head />
        <Preview>Cancellation Request from {partnerName}</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={header}>
                    <Heading style={h1}>Cancellation Request ⚠️</Heading>
                </Section>
                <Section style={content}>

                    <Text style={text}>
                        A partner has requested to cancel their subscription.
                    </Text>

                    <Section style={detailsContainer}>
                        <div style={row}>
                            <Text style={label}>Partner Name</Text>
                            <Text style={value}>{partnerName}</Text>
                        </div>
                        <Hr style={innerHr} />
                        <div style={row}>
                            <Text style={label}>Partner ID</Text>
                            <Text style={value}>{partnerId}</Text>
                        </div>
                        <Hr style={innerHr} />
                        <div style={row}>
                            <Text style={label}>Email</Text>
                            <Text style={value}>{partnerEmail}</Text>
                        </div>
                    </Section>

                    <Text style={label}>Reason for Cancellation:</Text>
                    <Section style={reasonBox}>
                        <Text style={value}>{reason}</Text>
                    </Section>

                    <Text style={text}>
                        Please review this request in the admin dashboard and take necessary action.
                    </Text>

                    <Hr style={hr} />
                    <Text style={footer}>
                        Admin Notification System
                    </Text>
                </Section>
            </Container>
        </Body>
    </Html>
);

const main = {
    backgroundColor: "#f6f9fc",
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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
    borderBottom: "1px solid #f3f4f6",
};

const content = {
    padding: "32px 40px",
};

const h1 = {
    color: "#dc2626",
    fontSize: "24px",
    fontWeight: "700",
    textAlign: "center" as const,
    margin: 0,
};

const text = {
    color: "#4a4a4a",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "16px 0",
};

const detailsContainer = {
    backgroundColor: "#f9fafb",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    padding: "0 20px",
    marginTop: "24px",
    marginBottom: "24px",
};

const row = {
    padding: "16px 0",
};

const label = {
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    margin: "0 0 4px",
};

const value = {
    color: "#111827",
    fontSize: "16px",
    fontWeight: "500",
    margin: 0,
};

const innerHr = {
    borderColor: "#e5e7eb",
    margin: "0",
};

const reasonBox = {
    backgroundColor: "#fef2f2",
    border: "1px solid #fee2e2",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "24px",
};

const hr = {
    borderColor: "#e5e7eb",
    margin: "32px 0 24px",
};

const footer = {
    color: "#9ca3af",
    fontSize: "13px",
    lineHeight: "20px",
    textAlign: "center" as const,
};

export default CancelRequestEmail;
