export const paymentStatus = (id: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Status</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 100px;
            transition: all 0.3s ease;
          }
          .status {
            display: none;
          }
          .success {
            color: green;
          }
          .failed {
            color: red;
          }
          h1 {
            margin-bottom: 10px;
          }
          p {
            margin-top: 8px;
          }
          .loader {
            font-size: 18px;
            color: #555;
          }
        </style>
      </head>
      <body>
        <div id="loader" class="loader">⏳ Verifying your payment, please wait...</div>
        
        <div id="success" class="status success">
          <h1>✅</h1>
          <h1>Your payment has been received</h1>
          <p>Thank you for your payment! Your booking has been confirmed.</p>
          <p>Stay tuned for further updates.</p>
        </div>

        <div id="failed" class="status failed">
          <h1>❌</h1>
          <h1>Payment or Booking Failed</h1>
          <p>We couldn’t process your payment. Please try again or contact support.</p>
        </div>

        <script>
          fetch('http://localhost:4012/api/v1/booking/verify/${id}', {
            method: 'POST'
          })
          .then(res => res.json())
          .then(data => {
            console.log("Capture result:", data);
            document.getElementById("loader").style.display = "none";

            if (data?.result?.status === "paid") {
              document.getElementById("success").style.display = "block";
            } else {
              document.getElementById("failed").style.display = "block";
            }
          })
          .catch(err => {
            console.error("Capture error:", err);
            document.getElementById("loader").style.display = "none";
            document.getElementById("failed").style.display = "block";
          });
        </script>
      </body>
    </html>
  `;
};

export const termCondition = (key: string) => {
  const title = key === "User" ? "Job Seeker" : "Expert";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        // <title>Terms & Conditions</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>

        <div id="loader">⏳ Loading…</div>
        <h2>${title} Terms & Conditions</h2>
        <div id="contentBox" style="display:none;"></div>

        <script>
          fetch('https://api.sefr.sa/api/v1/admin/get-all-terms-and-condition?key=${key}')
            .then(res => res.json())
            .then(data => {
              document.getElementById("loader").style.display = "none";

              let item = null;

              if (Array.isArray(data.result)) {
                item = data.result.find(r => r.key === "${key}") || data.result[0];
              }

              if (!item || !item.content) {
                document.body.innerHTML = "<p>❌ Content not found</p>";
                return;
              }

              const box = document.getElementById("contentBox");
              box.style.display = "block";
              box.innerHTML = item.content;
            })
            .catch(() => {
              document.getElementById("loader").innerText = "❌ Failed to load content";
            });
        </script>

      </body>
    </html>
  `;
};
export const privacyPolicy = (key: string) => {
  const title = key === "User" ? "Job Seeker" : "Expert";

  return `
    <!DOCTYPE html>
    <html>
      <head>       
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>

        <div id="loader">⏳ Loading…</div>
        <h2>${title} Privacy Policy</h2>
        <div id="contentBox" style="display:none;"></div>

        <script>
          fetch('https://api.sefr.sa/api/v1/admin/privacy-policy?key=${key}')
            .then(res => res.json())
            .then(data => {
              document.getElementById("loader").style.display = "none";

              let item = null;

              if (Array.isArray(data.result)) {
                item = data.result.find(r => r.key === "${key}") || data.result[0];
              }

              if (!item || !item.content) {
                document.body.innerHTML = "<p>❌ Content not found</p>";
                return;
              }

              const box = document.getElementById("contentBox");
              box.style.display = "block";
              box.innerHTML = item.content;
            })
            .catch(() => {
              document.getElementById("loader").innerText = "❌ Failed to load content";
            });
        </script>

      </body>
    </html>
  `;
};

export const dataDelete = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Delete Data</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
 
    * {
 
      box-sizing: border-box;
 
    }
 
    body {
 
      font-family: Arial, sans-serif;
 
      background-color: #f6f6f6;
 
      padding: 0;
 
      margin: 0;
 
    }
 
    .container {
 
      max-width: 400px;
 
      margin: 80px auto;
 
      background-color: #ffffff;
 
      padding: 30px;
 
      border-radius: 10px;
 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
 
    }
 
    h2 {
 
      color: #d32f2f;
 
      text-align: center;
 
      margin-bottom: 20px;
 
    }
 
    label {
 
      display: block;
 
      margin-bottom: 6px;
 
      font-weight: 600;
 
    }
 
    input[type="email"],
 
    input[type="password"] {
 
      width: 100%;
 
      padding: 10px;
 
      margin-bottom: 20px;
 
      border: 1px solid #ccc;
 
      border-radius: 6px;
 
      font-size: 14px;
 
    }
 
    button {
 
      width: 100%;
 
      padding: 12px;
 
      background-color: #d32f2f;
 
      color: #ffffff;
 
      border: none;
 
      border-radius: 6px;
 
      font-size: 16px;
 
      cursor: pointer;
 
      transition: background-color 0.3s ease;
 
    }
 
    button:hover {
 
      background-color: #b71c1c;
 
    }
 
    .note {
 
      font-size: 13px;
 
      color: #555;
 
      text-align: center;
 
      margin-top: 15px;
 
    }
</style>
</head>
<body>
 
<div class="container">
<h2>Delete Your Data</h2>
 
  <form onsubmit="handleDelete(event)">
<label for="email">Email</label>
<input type="email" id="email" name="email" required>
 
    <label for="password">Password</label>
<input type="password" id="password" name="password" required>
 
    <button type="submit">Confirm</button>
</form>
 
  <div class="note">
 
    This action is irreversible. Please confirm carefully.
</div>
</div>
 
<script>
 
  function handleDelete(e) {
 
    e.preventDefault();
 
    const email = document.getElementById("email").value.trim();
 
    const password = document.getElementById("password").value.trim();
 
    if (!email || !password) {
 
      alert("Please fill in both fields.");
 
      return;
 
    }
 
    const confirmed = confirm(Are you sure you want to delete the account?);
 
    if (confirmed) {
 
      // TODO: Send deletion request to server here
 
      alert("Your account has been marked for deletion.");
 
    }
 
  }
</script>
 
</body>
</html>
 
 `;
};

export const dataAccount = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Delete Account</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
 
    * {
 
      box-sizing: border-box;
 
    }
 
    body {
 
      font-family: Arial, sans-serif;
 
      background-color: #f6f6f6;
 
      padding: 0;
 
      margin: 0;
 
    }
 
    .container {
 
      max-width: 400px;
 
      margin: 80px auto;
 
      background-color: #ffffff;
 
      padding: 30px;
 
      border-radius: 10px;
 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
 
    }
 
    h2 {
 
      color: #d32f2f;
 
      text-align: center;
 
      margin-bottom: 20px;
 
    }
 
    label {
 
      display: block;
 
      margin-bottom: 6px;
 
      font-weight: 600;
 
    }
 
    input[type="email"],
 
    input[type="password"] {
 
      width: 100%;
 
      padding: 10px;
 
      margin-bottom: 20px;
 
      border: 1px solid #ccc;
 
      border-radius: 6px;
 
      font-size: 14px;
 
    }
 
    button {
 
      width: 100%;
 
      padding: 12px;
 
      background-color: #d32f2f;
 
      color: #ffffff;
 
      border: none;
 
      border-radius: 6px;
 
      font-size: 16px;
 
      cursor: pointer;
 
      transition: background-color 0.3s ease;
 
    }
 
    button:hover {
 
      background-color: #b71c1c;
 
    }
 
    .note {
 
      font-size: 13px;
 
      color: #555;
 
      text-align: center;
 
      margin-top: 15px;
 
    }
</style>
</head>
<body>
 
<div class="container">
<h2>Delete Your Account</h2>
 
  <form onsubmit="handleDelete(event)">
<label for="email">Email</label>
<input type="email" id="email" name="email" required>
 
    <label for="password">Password</label>
<input type="password" id="password" name="password" required>
 
    <button type="submit">Confirm</button>
</form>
 
  <div class="note">
 
    This action is irreversible. Please confirm carefully.
</div>
</div>
 
<script>
 
  function handleDelete(e) {
 
    e.preventDefault();
 
    const email = document.getElementById("email").value.trim();
 
    const password = document.getElementById("password").value.trim();
 
    if (!email || !password) {
 
      alert("Please fill in both fields.");
 
      return;
 
    }
 
    const confirmed = confirm(Are you sure you want to delete the account?);
 
    if (confirmed) {
 
      // TODO: Send deletion request to server here
 
      alert("Your account has been marked for deletion.");
 
    }
 
  }
</script>
 
</body>
</html>
 
 `;
};

export const supportPage = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Sefr - Support</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: Arial, sans-serif;
    background-color: #f9f9f9;
    color: #333;
    line-height: 1.6;
  }

  .header {
    background-color: #2c3e50;
    color: #ffffff;
    text-align: center;
    padding: 40px 20px;
  }

  .header h1 {
    font-size: 32px;
    margin-bottom: 10px;
  }

  .header p {
    font-size: 16px;
    opacity: 0.9;
  }

  .container {
    max-width: 900px;
    margin: 40px auto;
    background-color: #ffffff;
    padding: 40px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  h2 {
    color: #2c3e50;
    margin-bottom: 15px;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
  }

  .section {
    margin-bottom: 40px;
  }

  .contact-info {
    background-color: #ecf0f1;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
  }

  .contact-info p {
    font-size: 16px;
    margin-bottom: 10px;
  }

  .contact-info a {
    color: #3498db;
    text-decoration: none;
    font-weight: 600;
  }

  .contact-info a:hover {
    text-decoration: underline;
  }

  .faq-item {
    margin-bottom: 25px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e0e0e0;
  }

  .faq-item:last-child {
    border-bottom: none;
  }

  .faq-question {
    font-weight: 600;
    font-size: 18px;
    color: #2c3e50;
    margin-bottom: 10px;
  }

  .faq-answer {
    color: #555;
    font-size: 15px;
    padding-left: 20px;
  }

  .report-section {
    background-color: #fff3cd;
    padding: 20px;
    border-radius: 8px;
    border-left: 4px solid #ffc107;
  }

  .report-section h3 {
    color: #856404;
    margin-bottom: 10px;
  }

  .report-section p {
    color: #856404;
    margin-bottom: 10px;
  }

  .report-section ul {
    margin-left: 20px;
    color: #856404;
  }

  .report-section ul li {
    margin-bottom: 5px;
  }

  .btn-link {
    display: inline-block;
    background-color: #3498db;
    color: #ffffff;
    padding: 12px 24px;
    border-radius: 6px;
    text-decoration: none;
    margin-top: 15px;
    transition: background-color 0.3s ease;
  }

  .btn-link:hover {
    background-color: #2980b9;
  }

  .footer {
    text-align: center;
    padding: 30px 20px;
    color: #777;
    font-size: 14px;
  }
</style>
</head>
<body>

<div class="header">
  <h1>Sefr Support</h1>
  <p>We're here to help you</p>
</div>

<div class="container">
  
  <div class="section contact-info">
    <h2>Contact Information</h2>
    <p><strong>App Name:</strong> Sefr</p>
    <p><strong>Support Email:</strong> <a href="mailto:tech@sefr.sa">tech@sefr.sa</a></p>
    <p>For any inquiries, technical issues, or support requests, please contact us at the email above.</p>
  </div>

  <div class="section">
    <h2>Frequently Asked Questions (FAQ)</h2>
    
    <div class="faq-item">
      <div class="faq-question">Q: What is Sefr?</div>
      <div class="faq-answer">A: Sefr is a platform that connects job seekers with experts for professional guidance, mock interviews, and career consultations.</div>
    </div>

    <div class="faq-item">
      <div class="faq-question">Q: How do I book a session with an expert?</div>
      <div class="faq-answer">A: Browse through our list of available experts, select your preferred time slot, and complete the booking process through the app.</div>
    </div>

    <div class="faq-item">
      <div class="faq-question">Q: What payment methods are accepted?</div>
      <div class="faq-answer">A: We accept various payment methods including credit cards, debit cards, and other secure payment options available in your region.</div>
    </div>

    <div class="faq-item">
      <div class="faq-question">Q: Can I cancel or reschedule my booking?</div>
      <div class="faq-answer">A: Yes, you can cancel or reschedule your booking according to our cancellation policy. Please refer to the terms and conditions for specific timeframes.</div>
    </div>

    <div class="faq-item">
      <div class="faq-question">Q: How do I become an expert on Sefr?</div>
      <div class="faq-answer">A: You can apply to become an expert through our app. Your application will be reviewed by our team, and you'll be notified once approved.</div>
    </div>

    <div class="faq-item">
      <div class="faq-question">Q: Is my data secure?</div>
      <div class="faq-answer">A: Yes, we take data security seriously. Please review our <a href="https://api.sefr.sa/user-privacy-policy" target="_blank">Privacy Policy</a> for detailed information on how we protect your data.</div>
    </div>

    <div class="faq-item">
      <div class="faq-question">Q: How can I delete my account?</div>
      <div class="faq-answer">A: You can delete your account through the app settings or by contacting our support team at tech@sefr.sa.</div>
    </div>
  </div>

  <div class="section report-section">
    <h3>How to Report Issues</h3>
    <p>If you encounter any problems or issues while using Sefr, please report them to us. Here's how:</p>
    <ul>
      <li><strong>Email:</strong> Send a detailed description of the issue to <a href="mailto:tech@sefr.sa">tech@sefr.sa</a></li>
      <li><strong>Include:</strong> Your account email, device information, and screenshots if applicable</li>
      <li><strong>Response Time:</strong> We typically respond within 24-48 hours</li>
    </ul>
    <p style="margin-top: 15px;">For urgent issues affecting your bookings or payments, please mark your email as "URGENT" in the subject line.</p>
  </div>

  <div class="section">
    <h2>Privacy Policy</h2>
    <p>Your privacy is important to us. Please review our privacy policy to understand how we collect, use, and protect your personal information.</p>
    <a href="https://api.sefr.sa/user-privacy-policy" class="btn-link" target="_blank">View Privacy Policy</a>
  </div>

</div>

<div class="footer">
  <p>&copy; 2026 Sefr. All rights reserved.</p>
  <p>For support inquiries: <a href="mailto:tech@sefr.sa">tech@sefr.sa</a></p>
</div>

</body>
</html>
`;
};
