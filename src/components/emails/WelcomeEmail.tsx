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
    Img,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
    partnerName: string;
    planName: string;
    loginLink?: string;
}

export const WelcomeEmail = ({
    partnerName = "Partner",
    planName = "Free Trial",
    loginLink = "https://cravings.live/login",
}: WelcomeEmailProps) => (
    <Html>
        <Head />
        <Preview>Welcome to Cravings! Your digital journey starts here.</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={header}>
                    <Text style={logo}>Cravings</Text>
                </Section>
                <Section style={content}>
                    <Heading style={h1}>Welcome to Cravings!</Heading>
                    <Text style={text}>Hi {partnerName},</Text>
                    <Text style={text}>
                        Thank you for joining Cravings. We are excited to help you digitize your restaurant and grow your business.
                    </Text>
                    <Text style={text}>
                        You have successfully subscribed to the <strong>{planName}</strong> plan.
                    </Text>
                    <Section style={btnContainer}>
                        <Button style={button} href={loginLink}>
                            Access Dashboard
                        </Button>
                    </Section>
                    <Text style={text}>
                        If you need any help getting set up, reply to this email or contact our support team.
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
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px 0 48px",
    marginBottom: "64px",
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
    textAlign: "left" as const,
    margin: "30px 0",
};

const text = {
    color: "#333",
    fontSize: "16px",
    lineHeight: "24px",
    textAlign: "left" as const,
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
    lineHeight: "16px",
};

export default WelcomeEmail;
