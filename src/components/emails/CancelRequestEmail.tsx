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
                <Section style={content}>
                    <Heading style={h1}>Cancellation Request</Heading>
                    <Text style={text}>
                        A partner has requested to cancel their subscription.
                    </Text>
                    <Section style={infoBox}>
                        <Text style={boldText}>Partner Name: {partnerName}</Text>
                        <Text style={text}>Partner ID: {partnerId}</Text>
                        <Text style={text}>Email: {partnerEmail}</Text>
                        <Hr />
                        <Text style={boldText}>Reason:</Text>
                        <Text style={text}>{reason}</Text>
                    </Section>
                    <Text style={text}>
                        Please review this request in the admin dashboard and take necessary action.
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
    padding: "20px",
    maxWidth: "600px",
};

const content = {
    padding: "20px",
};

const h1 = {
    color: "#d93025", // Red for alert
    fontSize: "24px",
    fontWeight: "bold",
    margin: "20px 0",
};

const text = {
    color: "#333",
    fontSize: "16px",
    lineHeight: "24px",
};

const boldText = {
    ...text,
    fontWeight: "bold",
};

const infoBox = {
    backgroundColor: "#f9f9f9",
    padding: "15px",
    borderRadius: "5px",
    margin: "20px 0",
    border: "1px solid #eee",
};

export default CancelRequestEmail;
