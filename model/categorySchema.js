const mongoose=require('mongoose')

const categorySchema=new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true, // Removes extra whitespace
      },
      description: {
        type: String,
        required: false,
        trim: true,
      },
      image:[{
        type:String
      }]
})