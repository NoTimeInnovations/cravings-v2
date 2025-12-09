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

interface CancelConfirmationEmailProps {
    partnerName: string;
}

export const CancelConfirmationEmail = ({
    partnerName = "Partner",
}: CancelConfirmationEmailProps) => (
    <Html>
        <Head />
        <Preview>We received your cancellation request</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={header}>
                    <Text style={logo}>Cravings</Text>
                </Section>
                <Section style={content}>
                    <Heading style={h1}>Cancellation Request Received</Heading>
                    <Text style={text}>Hi {partnerName},</Text>
                    <Text style={text}>
                        We have received your request to cancel your subscription. We are sorry to see you go!
                    </Text>
                    <Text style={text}>
                        Our support team will process your request within 24-48 hours and contact you if any further information is needed regarding refunds or account closure.
                    </Text>
                    <Text style={text}>
                        In the meantime, your account remains active.
                    </Text>
                    <Hr style={hr} />
                    <Text style={footer}>
                        © 2024 Cravings. All rights reserved.
                    </Text>
                </Section>
            </Container>
        </Body>
    </Html>
);

const main = {
    backgroundColor: "#f6f9fc",
    fontFamily: 'sans-serif',
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px 0 48px",
};

const header = {
    padding: "24px",
    textAlign: "center" as const,
};

const logo = {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#ea580c",
};

const content = {
    padding: "0 48px",
};

const h1 = {
    color: "#333",
    fontSize: "24px",
    fontWeight: "bold",
    margin: "30px 0",
};

const text = {
    color: "#333",
    fontSize: "16px",
    lineHeight: "24px",
};

const hr = {
    borderColor: "#e6ebf1",
    margin: "20px 0",
};

const footer = {
    color: "#8898aa",
    fontSize: "12px",
};

export default CancelConfirmationEmail;
