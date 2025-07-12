const mongoose = require("mongoose");
const validator = require("validator");

// 1. Schema do Mongoose (sem alterações, já é JS válido)
// Removi o campo 'confirmedPassword' pois ele não deve ser salvo no banco.
const LoginAndSignUpSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  userPhoto: { type: String, required: false }, // Opcional
});

const LoginAndSignUpModel = mongoose.model("Accounts", LoginAndSignUpSchema);

// 2. Classe convertida para JavaScript puro (ES6)
class LoginAndSignUp {
  // O construtor permanece o mesmo, sem as anotações de tipo
  constructor(body) {
    this.body = body;
    this.erros = [];
    this.user = null;
  }

  async register() {
    this.validations();

    // Se já houver erros de validação, para a execução
    if (this.erros.length > 0) return;

    // Verifica se o usuário já existe
    const userExists = await LoginAndSignUpModel.findOne({ email: this.body.email });
    if (userExists) {
      this.erros.push("Já possui uma conta com esse E-mail!");
    }
    
    // Se ainda não houver erros, cria o usuário
    if (this.erros.length === 0) {
    

      this.user = await LoginAndSignUpModel.create(this.body);
    }
  }

  async login() {
    // Valida se o e-mail e a senha têm o formato correto
    if (!validator.isEmail(this.body.email)) {
        this.erros.push("E-mail Inválido!");
        return;
    }
    if (this.body.password.length < 3) {
        this.erros.push("A senha precisa ter pelo menos 3 caracteres.");
        return;
    }

    this.user = await LoginAndSignUpModel.findOne({ email: this.body.email });

    if (!this.user) {
      this.erros.push("Usuário não existe!");
      return;
    }

    // IMPORTANTE: Aqui você deve comparar a senha enviada com o hash salvo no banco.
    // Exemplo: if(!bcrypt.compareSync(this.body.password, this.user.password)) { ... }
    if (this.user.password !== this.body.password) {
      this.erros.push("Senha incorreta!");
      this.user = null; // Limpa o usuário em caso de senha errada
      return;
    }
  }

  validations() {
    // Garante que todos os campos obrigatórios foram preenchidos
    for(const key in this.body) {
        if(typeof this.body[key] !== 'string') {
            this.body[key] = ''; // Converte para string para evitar erros
        }
    }

    if (!validator.isEmail(this.body.email)) {
      this.erros.push("E-mail Inválido!");
    }

    if (this.body.password.length < 3 || this.body.password.length > 50) {
      this.erros.push("A senha precisa ter entre 3 e 50 caracteres.");
    }
    
    if (this.body.password !== this.body.confirmedPassword) {
      this.erros.push("As senhas não coincidem!");
    }
  }
}

// 3. Exporta a classe para ser usada em outras partes do seu código
module.exports = LoginAndSignUp;