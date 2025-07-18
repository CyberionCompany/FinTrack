const CategorySchema = new Schema({
    name: { type: String, required: true },
    // A referência ao usuário é opcional para permitir categorias padrão
    user: { type: Schema.Types.ObjectId, ref: 'Accounts', index: true },
}, { timestamps: true });
export const Category = mongoose.model('Category', CategorySchema);