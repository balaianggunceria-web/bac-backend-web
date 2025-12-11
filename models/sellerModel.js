const{Schema, model} = require("mongoose");

const sellerSchema = new Schema({
    name: {
        type: String,
        require: true
    },
    email: {
        type: String,
        require: true
    },
    password: {
        type: String,
        require: true,
        select: false
    },
    role: {
        type: String,
        default: 'seller'
    },
    status: {
        type: String,
        default: 'pending'
    },
    payment: {
        type: String,
        default: 'inactive'
    },
    method: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: ''
    },
    shopInfo: {
        type: Object,
        default: {}
    },

},{timestamps: true})

sellerSchema.index({
    name: 'text',
    email: 'text', 
},{
    weights: {
        name: 5,
        email: 4, 
    }

})

module.exports = model('sellers', sellerSchema)