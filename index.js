const express = require("express");
const webPush = require("web-push");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(cors());

// VAPID keys from environment variables
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

webPush.setVapidDetails(
  "mailto:your-email@example.com",
  publicVapidKey,
  privateVapidKey
);

let subscriptions = [];

app.post("/subscribe", (req, res) => {
  const { fingerprint, addressWallet, subscription } = req.body;

  try {
    // Tìm bản ghi hiện có (nếu có)
    const existingIndex = subscriptions.findIndex(
      (sub) =>
        sub.addressWallet === addressWallet && sub.fingerprint === fingerprint
    );

    if (existingIndex !== -1) {
      // Cập nhật bản ghi hiện có
      subscriptions[existingIndex] = {
        ...subscriptions[existingIndex],
        subscription,
        status: "ACTIVE",
      };
    } else {
      // Tạo bản ghi mới
      subscriptions.push({
        addressWallet,
        fingerprint,
        subscription,
        status: "ACTIVE",
      });
    }

    // Cập nhật các bản ghi khác cùng addressWallet sang INACTIVE
    subscriptions.forEach((sub, index) => {
      if (
        sub.addressWallet === addressWallet &&
        sub.fingerprint !== fingerprint
      ) {
        subscriptions[index] = { ...sub, status: "INACTIVE" };
      }
    });

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating subscription", error: error.message });
  }
});

app.post("/unsubscribe", (req, res) => {
  const { addressWallet } = req.body;

  // Tìm bản ghi hiện có (nếu có)
  subscriptions = subscriptions.filter(
    (sub) => sub.addressWallet !== addressWallet
  );

  console.log(subscriptions);

  res.status(200).json({
    success: true,
    message: "Unsubscribed successfully",
  });
});

app.post("/send-notification", async (req, res) => {
  const { addressWallet } = req.body;
  const payload = JSON.stringify({
    title: "Test Notification",
    body: "This is a test notification",
  });

  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.addressWallet === addressWallet && sub.status === "ACTIVE"
  );

  if (activeSubscriptions.length === 0) {
    return res
      .status(404)
      .json({ message: "No active subscriptions found for this wallet" });
  }

  activeSubscriptions.map(async (sub) => {
    await webPush
      .sendNotification(sub.subscription, payload)
      .then(() => {
        res.status(200).json({ message: "Notification sent successfully" });
      })
      .catch((error) => {
        res.status(500).json({
          message: "Error sending notification",
          error: error.message,
        });
      });
  });
});

app.get("/subscriptions", (req, res) => {
  res.status(200).json({ data: subscriptions });
});

module.exports = app;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
