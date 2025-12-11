const axios = require('axios');
const sellerModel = require('../models/sellerModel');
const { responseReturn } = require('../utiles/response');

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY; // simpan di .env

exports.createXenditSubAccount = async (req, res) => {
  const { id } = req; // dari middleware auth
  try {
    // Buat sub account di Xendit
    const result = await axios.post(
      'https://api.xendit.co/v2/accounts',
      {
        email: `sub_${id}@yourdomain.com`,
        type: 'OWNED',
        business_profile: {
          business_name: 'Sub Account ' + id,
          business_type: 'ONLINE_RETAIL',
          description: 'Seller sub account',
          country: 'ID'
        }
      },
      {
        auth: {
          username: XENDIT_SECRET_KEY,
          password: ''
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Update seller info
    await sellerModel.findByIdAndUpdate(id, {
      'payment.xenditPayment': 'active',
      'payment.xenditAccountId': result.data.id
    });

    responseReturn(res, 200, {
      success: true,
      message: 'Xendit sub account created successfully!',
      account: result.data
    });
  } catch (error) {
    console.error('Xendit error:', error.response?.data || error.message);
    responseReturn(res, 500, {
      error: 'Failed to create Xendit account',
      details: error.response?.data
    });
  }
};
