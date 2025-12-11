const authOrderModel = require('../../models/authOrder')
const customerOrder = require('../../models/customerOrder')
const myShopWallet = require('../../models/myShopWallet')
const sellerWallet = require('../../models/sellerWallet')
const cardModel = require('../../models/cardModel')
const { responseReturn } = require('../../utiles/response')
const axios = require('axios'); 


const moment = require("moment")
const { mongo: {ObjectId}} = require('mongoose')
const stripe = require('stripe')('sk_test_51SH7J42O6zVf9Ra2hPozwgplJEE5rZVsJCtKzmaKxMu0BxGkCqunHHCj6OqJ1SzCFjiiCNSciTK3LrlC88CQ1QRF00F55C8wxF');


async function getExchangeRate() {
    try {
      const { data } = await axios.get("https://open.er-api.com/v6/latest/USD");
      if (data && data.rates && data.rates.IDR) {
        console.log("💰 Kurs USD/IDR =", data.rates.IDR);
        return data.rates.IDR;
      } else {
        console.error("Format data API tidak sesuai, pakai default 15000:", data);
        return 15000;
      }
    } catch (error) {
      console.error("Gagal ambil kurs, pakai default 15000:", error.message);
      return 15000;
    }
  }
  

class orderController{

    paymentCheck = async (id) => {
        try {
            const order = await customerOrder.findById(id)
            if (order.payment_status === 'unpaid') {
                await customerOrder.findByIdAndUpdate(id, {
                    delivery_status: 'cancelled'
                })
                await authOrderModel.updateMany({
                    orderId: id
                },{
                    delivery_status: 'cancelled'
                })
            } 
            return true
        } catch (error) {
            console.log(error)
        }
    }

    // end method 

    place_order = async (req,res) => {
        console.log(req.body)
        const {price,products,shipping_fee,shippingInfo,userId } = req.body
        let authorOrderData = []
        let cardId = []
        const tempDate = moment(Date.now()).format('LLL')
        let customerOrderProduct = []

        for (let i = 0; i < products.length; i++) {
            const pro = products[i].products
            for (let j = 0; j < pro.length; j++) {
                const tempCusPro = pro[j].productInfo;
                tempCusPro.quantity = pro[j].quantity
                customerOrderProduct.push(tempCusPro)
                if (pro[j]._id) {
                    cardId.push(pro[j]._id)
                } 
            } 
        }

        try {
        
            const order = await customerOrder.create({
                customerId: userId,
                shippingInfo,
                products: customerOrderProduct,
                price: price + shipping_fee,
                payment_status: 'unpaid',
                delivery_status: 'pending',
                date: tempDate
            })
            for (let i = 0; i < products.length; i++) {
                const pro = products[i].products
                const pri = products[i].price
                const sellerId = products[i].sellerId
                let storePor = []
                for (let j = 0; j < pro.length; j++) {
                    const tempPro = pro[j].productInfo
                    tempPro.quantity = pro[j].quantity
                    storePor.push(tempPro)                    
                }

                authorOrderData.push({
                    orderId: order.id,sellerId,
                    products: storePor,
                    price:pri,
                    payment_status: 'unpaid',
                    shippingInfo,
                    delivery_status: 'pending',
                    date: tempDate
                }) 
            }

            await authOrderModel.insertMany(authorOrderData)
            for (let k = 0; k < cardId.length; k++) {
                await cardModel.findByIdAndDelete(cardId[k]) 
            }
            setTimeout(() => {
                this.paymentCheck(order.id)
            }, 15000)

            responseReturn(res,200,{message: "Order Placed Success" , orderId: order.id })
            
        } catch (error) {
            console.log(error.message) 
        }
    }
    // End Method 
    get_customer_dashboard_data = async(req,res) => {
        const{ userId } = req.params 
 
        try {
            const recentOrders = await customerOrder.find({
                customerId: new ObjectId(userId) 
            }).limit(5)
            const pendingOrder = await customerOrder.find({
                customerId: new ObjectId(userId),delivery_status: 'pending'
             }).countDocuments()
             const totalOrder = await customerOrder.find({
                customerId: new ObjectId(userId)
             }).countDocuments()
             const cancelledOrder = await customerOrder.find({
                customerId: new ObjectId(userId),delivery_status: 'cancelled'
             }).countDocuments()
             responseReturn(res, 200,{
                recentOrders,
                pendingOrder,
                totalOrder,
                cancelledOrder
             })
            
        } catch (error) {
            console.log(error.message)
        } 

    }
     // End Method
    
     get_orders = async (req, res) => {
        const {customerId, status} = req.params

        try {
            let orders = []
            if (status !== 'all') {
                orders = await customerOrder.find({
                    customerId: new ObjectId(customerId),
                    delivery_status: status
                })
            } else {
                orders = await customerOrder.find({
                    customerId: new ObjectId(customerId)
                })
            }
            responseReturn(res, 200,{
                orders
            })
            
        } catch (error) {
            console.log(error.message)
        }
     }
     // End Method 

    get_order_details = async (req, res) => {
        const {orderId} = req.params

    try {
        const order = await customerOrder.findById(orderId)
        responseReturn(res,200, {
            order
        })
        
    } catch (error) {
        console.log(error.message)
    }
     }
    // End Method 

    get_admin_orders = async(req, res) => {
        let {page,searchValue,parPage} = req.query
        page = parseInt(page)
        parPage= parseInt(parPage)
    
        const skipPage = parPage * (page - 1)
    
        try {
            if (searchValue) {
                
            } else {
                const orders = await customerOrder.aggregate([
                    {
                        $lookup: {
                            from: 'authororders',
                            localField: "_id",
                            foreignField: 'orderId',
                            as: 'suborder'
                        }
                    }
                ]).skip(skipPage).limit(parPage).sort({ createdAt: -1})
    
                const totalOrder = await customerOrder.aggregate([
                    {
                        $lookup: {
                            from: 'authororders',
                            localField: "_id",
                            foreignField: 'orderId',
                            as: 'suborder'
                        }
                    }
                ])
    
                responseReturn(res,200, { orders, totalOrder: totalOrder.length })
            }
        } catch (error) {
            console.log(error.message)
        } 
    
     }
    // End Method 

    get_admin_order = async (req, res) => {
        const { orderId } = req.params
        try {
    
            const order = await customerOrder.aggregate([
                {
                    $match: {_id: new ObjectId(orderId)}
                },
                {
                    $lookup: {
                        from: 'authororders',
                        localField: "_id",
                        foreignField: 'orderId',
                        as: 'suborder'
                    }
                }
            ])
            responseReturn(res,200, { order: order[0] })
        } catch (error) {
            console.log('get admin order details' + error.message)
        }
      }
    // End Method
    
    admin_order_status_update = async(req, res) => {
        const { orderId } = req.params
        const { status } = req.body
    
        try {
            await customerOrder.findByIdAndUpdate(orderId, {
                delivery_status : status
            })
            responseReturn(res,200, {message: 'order Status change success'})
        } catch (error) {
            console.log('get admin status error' + error.message)
            responseReturn(res,500, {message: 'internal server error'})
        }
         
      }
      // End Method
      
    get_seller_orders = async (req,res) => {
        const {sellerId} = req.params
        let {page,searchValue,parPage} = req.query
        page = parseInt(page)
        parPage= parseInt(parPage)

        const skipPage = parPage * (page - 1)

        try {
            if (searchValue) {
                
            } else {
                const orders = await authOrderModel.find({
                    sellerId,
                }).skip(skipPage).limit(parPage).sort({ createdAt: -1})
                const totalOrder = await authOrderModel.find({
                    sellerId
                }).countDocuments()
                responseReturn(res,200, {orders,totalOrder})
            }
            
        } catch (error) {
         console.log('get seller Order error' + error.message)
         responseReturn(res,500, {message: 'internal server error'})
        }
        
  }
  // End Method
  
  get_seller_order = async (req,res) => {
    const { orderId } = req.params
    
    try {
        const order = await authOrderModel.findById(orderId)
        responseReturn(res, 200, { order })
    } catch (error) {
        console.log('get seller details error' + error.message)
    }
  }
  // End Method
  
  seller_order_status_update = async(req,res) => {
    const {orderId} = req.params
    const { status } = req.body

    try {
        await authOrderModel.findByIdAndUpdate(orderId,{
            delivery_status: status
        })
        responseReturn(res,200, {message: 'order status updated successfully'})
    } catch (error) {
        console.log('get seller Order error' + error.message)
        responseReturn(res,500, {message: 'internal server error'})
    }

  }
  // End Method 

  create_payment = async (req, res) => {
    const { price } = req.body; // harga dalam IDR (contoh: 70020)
    try {
      // Ambil kurs dari API kamu
      const exchangeRate = await getExchangeRate(); // contoh: 16693.958413
      console.log("💰 Kurs USD/IDR =", exchangeRate);
  
      // Konversi harga ke USD (misal: 70020 / 16693.958 = 4.195 USD)
      let amountUSD = price / exchangeRate;
  
      // Batasi 2 desimal (biar nanti di dashboard muncul 4.19)
      const amountUSDFixed = Number(amountUSD.toFixed(2)); // hasil: 4.19
  
      // Stripe pakai satuan "cents", jadi kalikan 100 dan ubah ke integer
      const amountInCents = Math.round(amountUSDFixed * 100); // 4.19 → 419
  
      // Pastikan memenuhi minimum charge USD Stripe (umumnya $0.50)
      const minAmount = 50; // 50 cents = $0.50
      if (amountInCents < minAmount) {
        return responseReturn(res, 400, { message: 'Nominal terlalu kecil untuk Stripe.' });
      }
  
      // Buat PaymentIntent di Stripe
      const payment = await stripe.paymentIntents.create({
        amount: amountInCents, // <-- dalam cents
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        description: `Pembayaran Rp ${price.toLocaleString('id-ID')} (≈ $${amountUSDFixed})`,
        metadata: {
          amount_idr: price.toString(),
          rate_used: exchangeRate.toString(),
          amount_usd: amountUSDFixed.toString()
        }
      });
  
      responseReturn(res, 200, {
        clientSecret: payment.client_secret,
        price_idr: price,
        price_usd: amountUSDFixed,
        rate_used: exchangeRate
      });
    } catch (error) {
      console.error(error);
      responseReturn(res, 500, { message: 'Internal Server Error' });
    }
  };
  
 

  order_confirm = async (req,res) => {
    const {orderId} = req.params
    try {
        await customerOrder.findByIdAndUpdate(orderId, { payment_status: 'paid' })
        await authOrderModel.updateMany({ orderId: new ObjectId(orderId)},{
            payment_status: 'paid', delivery_status: 'pending'  
        })
        const cuOrder = await customerOrder.findById(orderId)

        const auOrder = await authOrderModel.find({
            orderId: new ObjectId(orderId)
        })

        const time = moment(Date.now()).format('l')
        const splitTime = time.split('/')

        await myShopWallet.create({
            amount: cuOrder.price,
            month: splitTime[0],
            year: splitTime[2]
        })

        for (let i = 0; i < auOrder.length; i++) {
             await sellerWallet.create({
                sellerId: auOrder[i].sellerId.toString(),
                amount: auOrder[i].price,
                month: splitTime[0],
                year: splitTime[2]
             }) 
        }
        responseReturn(res, 200, {message: 'success'}) 
        
       
    } catch (error) {
        console.log(error.message)
    }
  }
   // End Method


}

module.exports = new orderController()