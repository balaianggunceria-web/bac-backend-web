const{Schema, model} = require("mongoose");


const sellerCustomerSchema = new Schema({
    myId: {
        type: String,
        require: true
    },
    myFriends: {
        type: Array,
        default: []
    }
}, {timestamps:true})

module.exports = model('seller_customers', sellerCustomerSchema)