declare module "@cashfreepayments/cashfree-js" {
  interface CheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_top" | "_parent";
  }

  interface Cashfree {
    checkout(options: CheckoutOptions): void;
  }

  export function load(options: { mode: "sandbox" | "production" }): Promise<Cashfree>;
}
