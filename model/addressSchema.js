const mongoose=require("mongoose");

const addressSchema=new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user', required: true 
    },
    name: { 
        type: String,
        required: true 
    },
    phone: { 
        type: String, 
        required: true 
    },
    pinCode: { 
        type: String, 
        required: true 
    },
    addressLine1: { 
        type: String, 
        required: true 
    },
    addressLine2: { 
        type: String 
    },
    city: { 
        type: String, 
        required: true 
    },
    state: { 
        type: String, 
        required: true 
    },
    country: { 
        type: String, 
        required: true 
    },
    isDefault: { 
        type: Boolean, 
        default: false 
    },
},{timestamps:true});

module.exports = mongoose.model('Address', addressSchema);