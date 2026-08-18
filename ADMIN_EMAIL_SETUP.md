# MSG91 Admin Order Notification Configuration

## New Environment Variables Required

Add these variables to your `.env` file:

```env
# MSG91 Admin Email Configuration
MSG91_ADMIN_ORDER_TEMPLATE_ID=your_admin_order_template_id
ADMIN_EMAIL=admin@yourdomain.com
```

## MSG91 Email Template Variables

For the admin order notification email template in MSG91, use these variables:

- `{{company_name}}` - Company name
- `{{order_id}}` - Order ID
- `{{customer_name}}` - Customer name
- `{{customer_email}}` - Customer email
- `{{total_amount}}` - Total order amount
- `{{product_list}}` - List of products ordered
- `{{payment_status}}` - Payment status (SUCCESS)
- `{{order_date}}` - Order date and time

## Sample Email Template

```html
<!DOCTYPE html>
<html>
<head>
    <title>New Order Notification</title>
</head>
<body>
    <h2>New Order Received - {{company_name}}</h2>
    
    <h3>Order Details:</h3>
    <ul>
        <li><strong>Order ID:</strong> {{order_id}}</li>
        <li><strong>Order Date:</strong> {{order_date}}</li>
        <li><strong>Payment Status:</strong> {{payment_status}}</li>
        <li><strong>Total Amount:</strong> ₹{{total_amount}}</li>
    </ul>
    
    <h3>Customer Details:</h3>
    <ul>
        <li><strong>Name:</strong> {{customer_name}}</li>
        <li><strong>Email:</strong> {{customer_email}}</li>
    </ul>
    
    <h3>Products Ordered:</h3>
    <pre>{{product_list}}</pre>
    
    <p>Please process this order promptly.</p>
    
    <p>Best regards,<br>{{company_name}} System</p>
</body>
</html>
```

## Features Implemented

1. **Automatic Admin Notification**: When a payment is successful, an email is automatically sent to the admin
2. **Order Details**: Email includes order ID, customer details, amount, and product list
3. **Error Handling**: Email failures don't affect the payment processing
4. **Template Support**: Uses MSG91 email templates for consistent formatting
5. **Environment Configuration**: Configurable admin email and template IDs

## How It Works

1. When `checkPaymentStatus` is called and payment status is "SUCCESS"
2. The system extracts order details from the payment record
3. Formats the product list and order information
4. Sends an email to the configured admin email address using MSG91
5. Logs success/failure of the notification (doesn't affect payment flow)
