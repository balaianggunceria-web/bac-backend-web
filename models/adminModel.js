const{Schema, model} = require("mongoose");


const adminSchema = new Schema({
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
        require: true
    },
    image: {
        type: String,
        require: true
    },
    role: {
        type: String,
        default: 'admin'
    }
})

module.exports = model('admins', adminSchema)