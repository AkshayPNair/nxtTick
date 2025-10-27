const mongoose= require('mongoose');

const couponSchema= new mongoose.Schema({
    couponTitle: {
        type: String,
        required: true,
        trim: true,
      },
      couponCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      discountValue: {
        type: Number,
        required: true,
        min: 1, // Discount should be greater than 0
      },
      usagePerUser: {
        type: Number,
        required: true,
        min: 1, // At least one usage per user
      },
      minimumPrice: {
        type: Number,
        required: true,
        min: 0, // Minimum price should be non-negative
      },
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
        validate: {
          validator: function (value) {
            return value > this.startDate; // End date must be after start date
          },
          message: "End date must be after the start date.",
        },
      },
      isActive:{
        type:Boolean,
        default:true,
      },
      createdAt: {
        type: Date,
        default: Date.now, // Automatically set the creation date
      },
      updatedAt: {
        type: Date,
        default: Date.now, // Automatically set the last update date
      },
});

module.exports= mongoose.model('coupon',couponSchema);