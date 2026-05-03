type EmailResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type OrderEmailItem = {
  product_name: string;
  selected_size?: string | null;
  quantity: number;
  price: number;
};

export type OrderEmailData = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  status?: string | null;
  total: number;
  created_at?: string | null;
  order_items?: OrderEmailItem[];
};

export type ContactEmailData = {
  fullName: string;
  email: string;
  subject: string;
  message: string;
};

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatMmk = (value: number) => `${Math.round(value || 0).toLocaleString()} MMK`;

const getStoreName = () => process.env.STORE_NAME || "GOSH PERFUME";

const getFromEmail = () =>
  process.env.RESEND_FROM_EMAIL ||
  process.env.EMAIL_FROM ||
  "GOSH PERFUME <onboarding@resend.dev>";

const getAdminEmail = () =>
  process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || "";

export const sendTransactionalEmail = async ({
  to,
  subject,
  html,
  text,
  replyTo,
}: EmailPayload): Promise<EmailResult> => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("Email skipped: RESEND_API_KEY is not configured.");
    return { ok: true, skipped: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getFromEmail(),
        to,
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Email send failed:", error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed.";
    console.error("Email send failed:", message);
    return { ok: false, error: message };
  }
};

const renderOrderItems = (items: OrderEmailItem[] = []) => {
  if (items.length === 0) return "<p>No items found.</p>";

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <thead>
        <tr>
          <th align="left" style="padding:10px;border-bottom:1px solid #f3d65f">Item</th>
          <th align="center" style="padding:10px;border-bottom:1px solid #f3d65f">Qty</th>
          <th align="right" style="padding:10px;border-bottom:1px solid #f3d65f">Price</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
              <tr>
                <td style="padding:10px;border-bottom:1px solid #f7f1d2">
                  <strong>${escapeHtml(item.product_name)}</strong>
                  ${item.selected_size ? `<br /><span style="color:#666">${escapeHtml(item.selected_size)}</span>` : ""}
                </td>
                <td align="center" style="padding:10px;border-bottom:1px solid #f7f1d2">${escapeHtml(item.quantity)}</td>
                <td align="right" style="padding:10px;border-bottom:1px solid #f7f1d2">${escapeHtml(formatMmk(item.price))}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
};

const renderEmailShell = (title: string, body: string) => `
  <div style="margin:0;background:#fffdf6;padding:24px;font-family:Arial,sans-serif;color:#111">
    <div style="max-width:640px;margin:0 auto;border:1px solid #f3d65f;border-radius:24px;background:#fff;padding:28px">
      <p style="margin:0 0 8px;color:#c89100;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase">
        ${escapeHtml(getStoreName())}
      </p>
      <h1 style="margin:0 0 18px;font-size:28px;line-height:1.15">${escapeHtml(title)}</h1>
      ${body}
    </div>
  </div>
`;

export const sendAdminNewOrderEmail = async (order: OrderEmailData) => {
  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    console.warn("Admin order email skipped: ADMIN_NOTIFICATION_EMAIL is not configured.");
    return { ok: true, skipped: true };
  }

  const subject = `New order ${order.order_number}`;
  const body = `
    <p><strong>${escapeHtml(order.customer_name)}</strong> placed a new order.</p>
    <p>
      <strong>Total:</strong> ${escapeHtml(formatMmk(order.total))}<br />
      <strong>Phone:</strong> ${escapeHtml(order.phone)}<br />
      <strong>Payment:</strong> ${escapeHtml(order.payment_method)} (${escapeHtml(order.payment_status)})
    </p>
    ${renderOrderItems(order.order_items)}
  `;

  return sendTransactionalEmail({
    to: adminEmail,
    subject,
    html: renderEmailShell("New Order Received", body),
    text: `New order ${order.order_number} from ${order.customer_name}. Total: ${formatMmk(order.total)}.`,
  });
};

export const sendCustomerOrderConfirmationEmail = async (order: OrderEmailData) => {
  if (!order.customer_email) return { ok: true, skipped: true };

  const subject = `Your GOSH order ${order.order_number}`;
  const body = `
    <p>Hi ${escapeHtml(order.customer_name)},</p>
    <p>Thank you for your order. We received it and will update you when the status changes.</p>
    <p>
      <strong>Order:</strong> ${escapeHtml(order.order_number)}<br />
      <strong>Status:</strong> ${escapeHtml(order.status || "Pending")}<br />
      <strong>Total:</strong> ${escapeHtml(formatMmk(order.total))}
    </p>
    ${renderOrderItems(order.order_items)}
  `;

  return sendTransactionalEmail({
    to: order.customer_email,
    subject,
    html: renderEmailShell("Order Confirmed", body),
    text: `Thank you for your order ${order.order_number}. Total: ${formatMmk(order.total)}.`,
  });
};

export const sendCustomerOrderStatusEmail = async (
  order: OrderEmailData,
  previousStatus: string,
  nextStatus: string
) => {
  if (!order.customer_email) return { ok: true, skipped: true };

  const subject = `Order ${order.order_number} is now ${nextStatus}`;
  const body = `
    <p>Hi ${escapeHtml(order.customer_name)},</p>
    <p>Your order status changed from <strong>${escapeHtml(previousStatus)}</strong> to <strong>${escapeHtml(nextStatus)}</strong>.</p>
    <p>
      <strong>Order:</strong> ${escapeHtml(order.order_number)}<br />
      <strong>Total:</strong> ${escapeHtml(formatMmk(order.total))}
    </p>
  `;

  return sendTransactionalEmail({
    to: order.customer_email,
    subject,
    html: renderEmailShell("Order Status Updated", body),
    text: `Your order ${order.order_number} changed from ${previousStatus} to ${nextStatus}.`,
  });
};

export const sendAdminContactEmail = async (message: ContactEmailData) => {
  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    console.warn("Admin contact email skipped: ADMIN_NOTIFICATION_EMAIL is not configured.");
    return { ok: true, skipped: true };
  }

  const body = `
    <p><strong>${escapeHtml(message.fullName)}</strong> sent a contact message.</p>
    <p>
      <strong>Email:</strong> ${escapeHtml(message.email)}<br />
      <strong>Subject:</strong> ${escapeHtml(message.subject)}
    </p>
    <div style="margin-top:16px;padding:16px;border-radius:16px;background:#fff8d7;line-height:1.6">
      ${escapeHtml(message.message).replace(/\n/g, "<br />")}
    </div>
  `;

  return sendTransactionalEmail({
    to: adminEmail,
    subject: `New contact message: ${message.subject}`,
    html: renderEmailShell("New Contact Message", body),
    text: `New contact message from ${message.fullName} <${message.email}>: ${message.message}`,
    replyTo: message.email,
  });
};
