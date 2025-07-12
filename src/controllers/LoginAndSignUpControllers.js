const LoginAndSignUp = require("../models/LoginAndSignupModel");
  class LoginAndSignUpController {
   static async index(req, res) {
  try {
    // Se o usuário já está logado, redirecione para o dashboard e encerre a função.
    if (req.session.user) {
      return res.redirect("/dashboard/index"); 
    }

    // Se não estiver logado, renderize a página de login.
    return res.render("Login");

  } catch (e) {
    console.error(e); // É uma boa prática logar o erro no console do servidor
    return res.render("500"); // Renderiza uma página de erro 500
  }
}
   static async indexRegister(req, res) {
    try {
      return res.render("Register");
    } catch (e) {
      res.status(500).json({
        title: "Internal Server Error 500 !",
        status: "failed",
        error: e,
      });
    }
  }
   static async auth(req, res) {
    try {
      const loginAndSignUpModel = new LoginAndSignUp(req.body);
      await loginAndSignUpModel.login();
      if (loginAndSignUpModel.erros.length > 0) {
        req.flash("erros", loginAndSignUpModel.erros);
        return res.redirect("back");
      } else {
        req.session.user = loginAndSignUpModel.user;
        return res.redirect("/dashboard/index");
      }
    } catch (e) {
      res.status(500).json({
        title: "Internal Server Error 500 !",
        status: "failed",
        error: e.message,
      });
    }
  }
   static async createAccount(req, res) {
    try {
      req.body.office = "Colaborador";
      req.body.status = "Inautorizado";

      const loginAndSignUpModel = new LoginAndSignUp(req.body);
      await loginAndSignUpModel.register();
      if (loginAndSignUpModel.erros.length > 0) {
        req.flash("erros", loginAndSignUpModel.erros);
         return res.redirect("back");
      } else {
        req.flash("success", "Conta criada com sucesso !");
        return res.redirect("/");
      }
    } catch (e) {
      res.status(500).json({
        title: "Internal Server Error 500 !",
        status: "failed",
        error: e,
      });
    }
  }
   static async logout(req, res) {
    try {
      req.session.destroy();
      return  res.redirect("/");
    } catch (e) {
      res.status(500).json({
        title: "Internal Server Error 500 !",
        status: "failed",
        error: e,
      });
    }
  }
}

module.exports = LoginAndSignUpController;
