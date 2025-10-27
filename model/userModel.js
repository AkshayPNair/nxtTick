const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name:{
    type:String,
    require:true,
  },
  email: {
    type: String,
    required: true,
    unique:true
  },
  password: {
    type: String,
    required: function(){
      return !this.googleId;
    }
  },
  googleId: {
    type: String,
    sparse: true,
    index: {
      unique: true,
      partialFilterExpression: { googleId: { $exists: true } },
    },
  },
  status:{
    type:Boolean,
    default:true
  },
  isBlock:{
    type:Boolean,
    default:false
  },
  wishlist:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: "product"
  }],
  gender: {
    type: String, 
    enum: ['male', 'female', 'other',],
  },
  profileImage: {
    type: String, 
    default: null,
  },
});

module.exports = mongoose.model("user", userSchema);
