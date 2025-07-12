  class DashboardController {
   static async  index(req, res){
    try {
      if (!req.session.user) return res.redirect("/");
      return res.render("Dashboard");
    } catch (e) {
      res.status(500).json({
        title: "Internal Server Error 500 !",
        status: "failed",
        error: e,
      });
    }
  }
 
}

module.exports = DashboardController;
