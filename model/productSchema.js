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
    required: true,
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
    type: String
  }],
  status: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isWishlist: {
    type: Boolean,
    default: false,
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offer',
    default: null
  },
  discountedPrice: {
    type: Number,
    default: null
  },
  deletedAt: {
    type: Date,
    default: Date.now()
  },
  createdAt: {
    type: Date, 
    default: Date.now() 
  },
  updatedAt: {
    type: Date,
    default: Date.now()
  }
});

// Pre-save middleware to calculate discounted price
productSchema.pre('save', async function(next) {
  try {
    // Always set discountedPrice to regular price first
    this.discountedPrice = this.price;

    // Then check for offers and update if necessary
    if (this.offer) {
      const offer = await mongoose.model('Offer').findById(this.offer);
      if (offer && offer.isActive) {
        const discount = (this.price * offer.discountValue) / 100;
        this.discountedPrice = this.price - discount;
      }
    } else {
      // Check for category offer if no product offer exists
      const category = await mongoose.model('category')
        .findById(this.category)
        .populate('offer');
      
      if (category?.offer?.isActive) {
        const discount = (this.price * category.offer.discountValue) / 100;
        this.discountedPrice = this.price - discount;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

const product = mongoose.model('product', productSchema);

module.exports = product;
