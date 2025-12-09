import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Button,
    Hr,
} from "@react-email/components";
import * as React from "react";

interface UpgradeEmailProps {
    partnerName: string;
    newPlanName: string;
    features: string[];
    loginLink?: string;
}

export const UpgradeEmail = ({
    partnerName = "Partner",
    newPlanName = "Premium Plan",
    features = [],
    loginLink = "https://cravings.live/login",
}: UpgradeEmailProps) => (
    <Html>
        <Head />
        <Preview>Your plan has been upgraded!</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={header}>
                    <Text style={logo}>Cravings</Text>
                </Section>
                <Section style={content}>
                    <Heading style={h1}>Plan Upgraded Successfully 🚀</Heading>
                    <Text style={text}>Hi {partnerName},</Text>
                    <Text style={text}>
                        Great news! Your account has been successfully upgraded to the <strong>{newPlanName}</strong>.
                    </Text>
                    <Text style={text}>
                        You now have access to:
                    </Text>
                    <ul>
                        {features.map((feature, i) => (
                            <li key={i} style={li}>{feature}</li>
                        ))}
                    </ul>
                    <Section style={btnContainer}>
                        <Button style={button} href={loginLink}>
                            View Dashboard
                        </Button>
                    </Section>
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
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

const li = {
    color: "#333",
    fontSize: "16px",
    lineHeight: "24px",
    marginBottom: "8px",
};

const btnContainer = {
    textAlign: "center" as const,
    margin: "32px 0",
};

const button = {
    backgroundColor: "#ea580c",
    borderRadius: "5px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "block",
    padding: "12px 24px",
};

const hr = {
    borderColor: "#e6ebf1",
    margin: "20px 0",
};

const footer = {
    color: "#8898aa",
    fontSize: "12px",
};

export default UpgradeEmail;
