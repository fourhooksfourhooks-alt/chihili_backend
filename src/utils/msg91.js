import axios from 'axios';
import { config } from '../config/env.js';
import { User } from "../models/user.model.js";




export async function sendOtpSmsMsg91({ mobile, otp }) {
  const url = 'https://control.msg91.com/api/v5/flow';
  const headers = {
    accept: 'application/json',
    authkey: config.msg91AuthKey,
    'content-type': 'application/json'
  };
  const data = {
    template_id: config.msg91SMSOtptemplateId,
    short_url: '1',
    short_url_expiry: '300',
    realTimeResponse: '1',
    recipients: [
      {
        mobiles: mobile,
        var: otp
      }
    ]
  };
  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('MSG91 SMS Error:', error.response?.data || error.message);
    throw new Error('Failed to send OTP SMS');
  }
}

export async function sendOtpEmailMsg91({ email, name, otp }) {
  const url = 'https://control.msg91.com/api/v5/email/send';
  const headers = {
    accept: 'application/json',
    authkey: config.msg91AuthKey || 'YOUR_MSG91_AUTHKEY',
    'content-type': 'application/json'
  };

  const data = {
    recipients: [
      {
        to: [
          {
            email,
            name: name || email
          }
        ],
        variables: {
          company_name: config.companyName || 'Chihili',
          otp
        }
      }
    ],
    from: {
      name: config.companyName,
      email: config.msg91EmailFrom || `no-reply@${config.msg91Domain || 'example.com'}`
    },
    domain: config.msg91Domain || 'example.com',
    template_id: config.msg91EmailOtpTemplateId || 'global_otp'
  };

  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error('MSG91 EMAIL Error:', error.response?.data || error.message);
    throw new Error('Failed to send OTP Email');
  }
}


export async function sendEmailNotification(order) {
  try {
    const user = await User.findById(order.userId).select("name email phone");
    if (!user) {
      console.error(`❌ User not found for order ${order.orderId}`);
      return;
    }

    // Format product list with variant, SKU, MRP & discount info
    const productList = order.products
      .map((p) => {
        const productName = p.productName || p.productId?.name || "Product";
        const variant = p.variant || p.productId?.variants?.[0]; // fallback to first variant if available
        const size = variant?.attributes?.size ? `, Size: ${variant.attributes.size}` : "";
        const color = variant?.attributes?.color ? `, Color: ${variant.attributes.color}` : "";
        const sku = variant?.sku ? ` [SKU: ${variant.sku}]` : "";

        const price = p.price || variant?.price || 0;
        const mrp = variant?.mrp || price;
        const discount =
          mrp > price ? ` (MRP: ₹${mrp}, Saved: ₹${mrp - price})` : "";

        return `• ${productName}${sku}${size}${color}  
   Qty: ${p.quantity} × ₹${price} = ₹${p.quantity * price}${discount}`;
      })
      .join("\n");

    const data = {
      recipients: [
        {
          to: [
            {
              email: "admin@chihili.com",
              name: user.name || "Customer",
            },
          ],
          variables: {
            order_id: order.orderId,
            order_date: new Date(order.createdAt).toLocaleString("en-IN", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            payment_status: order.status,
            total_amount: `₹${order.amount}`,
            customer_name: user.name,
            customer_contact: user.phone || user.email,
            product_list: productList,
          },
        },
      ],
      from: {
        email: "admin@chihili.com",
      },
      domain: config.msg91Domain || "mail.chihili.com",
      template_id: config.msg91AdminOrderTemplateId,
    };

    const response = await axios.post(
      "https://control.msg91.com/api/v5/email/send",
      data,
      {
        headers: {
          "Content-Type": "application/json",
          authkey: config.msg91AuthKey,
        },
      }
    );

    console.log(`📧 Order email sent for ${order.orderId}`);
    return response.data;
  } catch (err) {
    console.error(
      `❌ Failed to send email for order ${order.orderId}:`,
      err.response?.data || err.message
    );
  }
}
