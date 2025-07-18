
const TransactionSchema = new Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    date: { type: Date, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'Accounts', required: true, index: true },
    account: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
}, { timestamps: true });

// Exportando os modelos
export const Transaction = mongoose.model('Transaction', TransactionSchema);