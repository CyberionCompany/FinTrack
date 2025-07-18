const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, 'A descrição é obrigatória.'],
        trim: true,
    },
    amount: {
        type: Number,
        required: [true, 'O valor é obrigatório.'],
        // O valor é sempre positivo. O `type` define se é entrada ou saída.
        validate: [val => val > 0, 'O valor deve ser positivo.']
    },
    type: {
        type: String,
        required: true,
        enum: ['income', 'expense'], // Só permite esses dois valores
    },
    category: {
        type: String,
        required: [true, 'A categoria é obrigatória.'],
        trim: true,
    },
    date: {
        type: Date,
        required: [true, 'A data é obrigatória.'],
    },


    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Aponta para o modelo 'User'
        required: true,
    },

    
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', TransactionSchema);