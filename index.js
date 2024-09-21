const express = require('express');
const webPush = require('web-push');
const cors = require('cors');
const dotenv = require('dotenv');

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
  'mailto:your-email@example.com',
  publicVapidKey,
  privateVapidKey
);

// Store subscriptions (in-memory for this example)
const subscriptions = new Set();

// Routes
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  subscriptions.add(subscription);
  console.log(subscriptions);
  res.status(201).json({});
});

app.post('/send-notification', (req, res) => {
  const payload = JSON.stringify({ title: 'Push notification', body: 'This is a push notification!' });
  
  subscriptions.forEach(async subscription => {
    console.log(subscription)
    await webPush.sendNotification(subscription, payload).then(()=>{
      console.log('Notification sent');
    }).catch(error => {
      console.error(error);
      subscriptions.delete(subscription);
    });
  });
  
  res.status(200).json({});
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
