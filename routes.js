const LoginAndSignUpController = require("./src/controllers/LoginAndSignUpControllers");
const DashboardController = require("./src/controllers/DashboardController");
const express = require("express");
const multer = require("multer");
const multerConfig = require("./src/config/multerConfig");
const router = express.Router();
const uploads = multer(multerConfig);
//login routes
router.get("/", LoginAndSignUpController.index);
router.post("/auth", LoginAndSignUpController.auth);
router.get("/register", LoginAndSignUpController.indexRegister);
router.post("/createAccount", LoginAndSignUpController.createAccount);
router.get("/logout/",LoginAndSignUpController.logout)
router.get("/dashboard/index",DashboardController.index);
module.exports = router;
 