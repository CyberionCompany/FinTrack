const express = require("express"); 
const path = require("path"); 
const mongoose = require("mongoose")
const session = require("express-session"); 
const flash = require("connect-flash"); 
const MongoStore = require("connect-mongo") 
const router = require("./routes"); 
const {middlewaresGlobal}  = require("./src/middleware/middlewares"); 
require("dotenv").config();
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
//defininndo biblioteca para parsing do conteudo de requisições 
app.use(express.urlencoded({ extended: true }));


//views define 
app.set("views",path.resolve(__dirname,"src","views")); 
app.set("view engine","ejs"); 

//mongo DB connection 
mongoose.connect(process.env.CONNECTION_URL).then((e) => {
    console.log("Conectando...");
    app.emit("Conected!");

})

app.on("Conected!", () => {
    app.listen(process.env.PORT, () => {
        console.log("Acesse : http://localhost:3000/")
    })
})
const sessionOptions = session({
  secret : "Aplication Session", 
  resave: false, 
  store: MongoStore.create({mongoUrl:process.env.CONNECTION_URL}), 
  saveUninitialized: false, 
  cookie: {
    httpOnly: true, 
    maxAge: 1000*7 * 60*1000, 
  }
}) 

//static files : 
//definindo as rotas usadas. 
app.use(sessionOptions); 
app.use(flash());  
app.use(middlewaresGlobal); 
app.use(router) 