const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
    required:true,
  },
  brand: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
    min: 0, 
  },
  price: {
    type: Number,
    required: true,
    min: 0, 
  },
  images:[{
    type:String
  }],
  status:{
    type:Boolean,
    default:true,
  },
  isDeleted:{
    type:Boolean,
    default:false,
  },
  deletedAt:{
    type:Date,
    default:Date.now
  },
  createdAt: {
     type: Date, 
     default: Date.now 
  },
  updatedAt:{
    type:Date,
    default:Date.now
  }
});

const product = mongoose.model('product', productSchema);

module.exports = product;
