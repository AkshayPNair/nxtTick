const mongoose=require("mongoose");

const orderSchema=new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user', 
        required: true 
    },
    address: { 
        type: Object, 
        required: true 
    }, // store the address object directly 
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
            quantity: { type: Number, required: true },
            subtotal: { type: Number, required: true },
        },
    ],
    total: { 
        type: Number, 
        required: true 
    },
    paymentMethod: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        default: "Pending" 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    shippedAt: {
        type: Date,
        default: null
    },
    deliveredAt: {
        type: Date,
        default: null
    },
    outForDeliveryAt: {
        type: Date,
        default: null
    }
})

module.exports=mongoose.model("Order",orderSchema)