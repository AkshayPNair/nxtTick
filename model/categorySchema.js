const mongoose=require('mongoose')

const categorySchema=new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
      },
      description: {
        type: String,
        required: false,
      },
      status:{
        type:Boolean,
        default:true,
      },
      isBlock:{
        type:Boolean,
        default:false,
      },
      image:[{
        type:String
      }],
      offer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'offer',
        default: null
      },
      createdAt: {
        type: Date, 
        default: Date.now 
     },
     updatedAt:{
       type:Date,
       default:Date.now
     }
})

const category=mongoose.model("category",categorySchema);

module.exports= category;