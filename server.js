const  express=require("express");
const app=express();
const path=require("path");
const hbs=require("hbs");

const port= process.env.PORT || 1111 ;

const userRoutes=require("./routes/user")
const adminRoutes=require("./routes/admin")
const connectDB=require("./db/connectDB")
const nocache=require("nocache");
const session=require("express-session")
const passport = require('passport');
require("./utils/passport")
require("dotenv").config()

//connect monogodb
connectDB();


hbs.registerHelper('gte', function (value1, value2) {
    return value1 >= value2;
});

hbs.registerHelper('eq', (a, b) => {
    if (!a || !b) return false; // Return false if either value is undefined or null
    return a.toString() === b.toString();
});
hbs.registerHelper('getImage', function (images, index) {
    return images && images[index];
});

//view engine setup
app.set('views',path.join(__dirname,'views'));
app.set('view engine','hbs');
//static files
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({extended:true}))
app.use(express.json())

app.use(nocache());
app.use(session({
    secret:"secretKey",
    resave:false,
    saveUninitialized:true,
    cookie:{
        maxAge: 24 * 60 * 60 * 1000, 
        secure: false, 
        httpOnly: true 
    }
}));
app.use(passport.initialize());
app.use(passport.session());

//partials path
const partialsPath=path.join(__dirname,"./views/partials")

//hbs partials
hbs.registerPartials(partialsPath);




app.use('/user',userRoutes);
app.use('/admin',adminRoutes);



app.get('/',(req,res)=>{
    res.redirect('/user/login')
})




app.listen(port,()=>{
    console.log(`App is listening on port :${port}`);
})