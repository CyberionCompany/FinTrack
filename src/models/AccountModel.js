// Schema da Conta
const AccountSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String },
    initialBalance: { type: Number, required: true, default: 0 },
    user: { type: Schema.Types.ObjectId, ref: 'Accounts', required: true, index: true },
}, { timestamps: true });
export const Account = mongoose.model('Account', AccountSchema);

