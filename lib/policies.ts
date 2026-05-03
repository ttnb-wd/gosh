import type { PolicyPageData } from "@/components/PolicyPage";

export const privacyPolicy: PolicyPageData = {
  label: "Privacy Policy",
  title: "Privacy Policy",
  summary:
    "How GOSH PERFUME collects, uses, protects, and stores customer information for orders, messages, delivery, payments, and support.",
  lastUpdated: "May 3, 2026",
  sections: [
    {
      title: "Information We Collect",
      body: [
        "When you place an order, create an account, contact us, or join our newsletter, we may collect your name, email, phone number, delivery address, city, order details, payment method, and payment proof screenshot.",
        "We may collect technical information such as browser type, device information, IP-related security signals, and website error logs to protect the store and improve reliability.",
        "We do not ask customers to send card PINs, mobile banking passwords, OTP codes, or full banking login details.",
      ],
    },
    {
      title: "How We Use Information",
      body: [
        "We use customer information to confirm orders, arrange delivery in Myanmar, verify local payment proof, respond to messages, manage customer support, and prevent fraud or spam.",
        "Order and payment information may be reviewed by authorized GOSH PERFUME admins only for business operations.",
        "Newsletter emails are used for store updates, promotions, and product announcements. Customers can request removal from the list at any time.",
      ],
    },
    {
      title: "Sharing And Storage",
      body: [
        "We may share necessary delivery details with delivery partners or couriers only for completing the order.",
        "We do not sell customer personal information.",
        "Order, customer, message, and payment proof records are stored in secure business systems such as Supabase and email/support tools used by GOSH PERFUME.",
      ],
    },
    {
      title: "Customer Rights And Contact",
      body: [
        "Customers may contact us to correct their name, phone, address, or email on an order before dispatch.",
        "Customers may request deletion of newsletter subscription data or ask about stored account information, subject to business record requirements for completed orders.",
        "For privacy questions, contact us through the Contact page or the store email shown on the website.",
      ],
    },
  ],
};

export const termsPolicy: PolicyPageData = {
  label: "Terms & Conditions",
  title: "Terms & Conditions",
  summary:
    "The customer rules for using the GOSH PERFUME website, placing orders, paying, and receiving perfume products in Myanmar.",
  lastUpdated: "May 3, 2026",
  sections: [
    {
      title: "Orders And Availability",
      body: [
        "All orders are subject to product availability, stock confirmation, and payment verification where applicable.",
        "Prices are shown in Myanmar Kyat unless stated otherwise. We may correct accidental pricing, stock, or product information errors before confirming an order.",
        "A submitted checkout form does not guarantee acceptance until GOSH PERFUME confirms the order or begins processing it.",
      ],
    },
    {
      title: "Customer Responsibilities",
      body: [
        "Customers must provide correct name, phone number, delivery address, city, and payment information.",
        "If delivery fails because the phone number or address is incorrect, additional delivery charges may apply.",
        "Customers must not upload false payment screenshots, spam forms, misuse accounts, or attempt unauthorized access to the website.",
      ],
    },
    {
      title: "Payments",
      body: [
        "Available payment methods may include Cash on Delivery, KBZPay, WavePay, AYA Pay, or bank transfer depending on store settings.",
        "For prepaid methods, orders may remain pending or verifying until payment proof is checked by our admin team.",
        "GOSH PERFUME will never ask for your mobile banking password, OTP, or personal banking login details.",
      ],
    },
    {
      title: "Product Information",
      body: [
        "Perfume color, packaging, bottle design, and scent impression may vary slightly because of batch, lighting, screen display, or supplier packaging updates.",
        "Decant products are prepared in smaller sizes from original fragrance stock and should be stored away from heat, sunlight, and children.",
        "Customers with allergies or sensitivity to fragrance ingredients should review product details carefully and contact us before ordering.",
      ],
    },
  ],
};

export const refundPolicy: PolicyPageData = {
  label: "Refund / Return Policy",
  title: "Refund & Return Policy",
  summary:
    "How returns, replacements, cancellations, damaged items, wrong items, and refunds are handled for fragrance orders.",
  lastUpdated: "May 3, 2026",
  sections: [
    {
      title: "Return Eligibility",
      body: [
        "Because perfume is a personal-use product, opened, sprayed, used, or damaged-by-customer items cannot normally be returned or exchanged.",
        "Returns may be accepted only for wrong item, damaged item on arrival, missing item, or confirmed product issue reported within 24 hours of delivery.",
        "Customers must keep packaging, product, invoice/order number, and clear photos or video evidence when reporting an issue.",
      ],
    },
    {
      title: "Refunds And Replacements",
      body: [
        "If the issue is confirmed by GOSH PERFUME, we may offer replacement, store credit, partial refund, or full refund depending on the case.",
        "Refunds for prepaid orders will normally be returned to the original payment channel where possible, or another agreed Myanmar payment method.",
        "Refund timing depends on bank/payment provider processing time and customer response speed.",
      ],
    },
    {
      title: "Cancellations",
      body: [
        "Customers may request cancellation before the order is confirmed, packed, or dispatched.",
        "Once an order has been dispatched, cancellation may not be possible and delivery charges may still apply.",
        "Custom, reserved, promotional, or limited items may have stricter cancellation conditions if clearly stated at purchase.",
      ],
    },
    {
      title: "Non-Returnable Cases",
      body: [
        "Change of mind after opening, dislike of scent after purchase, damage from heat/storage, and products without proof of purchase are not normally returnable.",
        "Minor packaging dents that do not affect the product may not qualify for a full refund, but we will review each case fairly.",
        "Fraudulent claims, altered screenshots, or repeated abusive return behavior may be refused.",
      ],
    },
  ],
};

export const deliveryPolicy: PolicyPageData = {
  label: "Delivery Policy",
  title: "Delivery Policy",
  summary:
    "How GOSH PERFUME prepares, dispatches, and delivers orders in Myanmar, including timing, fees, and customer responsibilities.",
  lastUpdated: "May 3, 2026",
  sections: [
    {
      title: "Delivery Areas And Timing",
      body: [
        "Delivery availability depends on city, township, courier coverage, road conditions, public holidays, and local operating hours.",
        "Yangon and major city orders may arrive faster than other regions, while remote areas may require additional delivery time.",
        "Estimated delivery times are not guaranteed, but we will try to keep customers informed when there are delays.",
      ],
    },
    {
      title: "Delivery Fees",
      body: [
        "Delivery fees, free delivery thresholds, or special promotions are shown during checkout or announced by GOSH PERFUME.",
        "Some townships, express delivery requests, or re-delivery attempts may require additional charges.",
        "If a payment or address issue delays dispatch, delivery timing starts after the order is confirmed and ready to ship.",
      ],
    },
    {
      title: "Receiving Orders",
      body: [
        "Customers should keep their phone reachable after ordering so the delivery team can confirm location and handover.",
        "Please inspect the package when receiving it. If the parcel looks seriously damaged, take photos or video before opening.",
        "For Cash on Delivery orders, please prepare the correct amount when possible to avoid handover delays.",
      ],
    },
    {
      title: "Failed Delivery",
      body: [
        "If delivery fails because the customer is unreachable, address details are wrong, or the customer refuses the parcel without valid reason, re-delivery fees may apply.",
        "GOSH PERFUME may cancel orders that cannot be delivered after reasonable contact attempts.",
        "For prepaid orders with failed delivery, refund or re-delivery options will be reviewed after deducting any courier or handling cost where applicable.",
      ],
    },
  ],
};

export const policies = [
  { href: "/privacy", title: "Privacy Policy", description: "Customer data, order records, payment proof, and newsletter privacy." },
  { href: "/terms", title: "Terms & Conditions", description: "Shop rules for orders, payment, product use, and customer responsibilities." },
  { href: "/refund-policy", title: "Refund / Return Policy", description: "Returns, damaged items, cancellations, refunds, and replacements." },
  { href: "/delivery-policy", title: "Delivery Policy", description: "Myanmar delivery timing, fees, receiving parcels, and failed delivery." },
];
