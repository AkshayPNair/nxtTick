const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    balance: {
        type: Number,
        default: 0,
      },
      transactions: [
        {
          type: {
            type: String,
            enum: ['credit', 'debit'], // Type of transaction (credit or debit)
            required: true,
          },
          amount: {
            type: Number,
            required: true,
          },
          date: {
            type: Date,
            default: Date.now,
          },
          description: {
            type: String,
          },
        },
      ],
});

module.exports = mongoose.model("wallet", walletSchema);
