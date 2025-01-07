const  express=require("express");
const app=express();
const path=require("path");
const hbs=require("hbs");
const moment = require('moment');

const port= process.env.PORT || 3000 ;

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

// hbs.registerHelper('eq', (a, b) => {
//     if (!a || !b) return false; // Return false if either value is undefined or null
//     return a.toString() === b.toString();
// });

hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

hbs.registerHelper('eq', (a, b) => {
    return Number(a) === Number(b);
});
hbs.registerHelper('eq', function(a, b, options) {
    if (a === b) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
});

hbs.registerHelper('eq', (a, b) => a === b);

hbs.registerHelper('gt', function (a, b) {
    return a > b;
});
  
hbs.registerHelper('lte', function (a, b) {
    return a <= b;
});

hbs.registerHelper('formatDate', function (date) {
    return moment(date).format('DD/MM/YYYY');
  });
  
hbs.registerHelper('and', function () {
    return Array.prototype.every.call(arguments, Boolean);
});

hbs.registerHelper('and', function() {
    return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
});

hbs.registerHelper('includes', function(array, value) {
    if (!array) return false;
    return array.map(item => item.toString()).includes(value.toString());
});


hbs.registerHelper('getImage', function (images, index) {
    return images && images[index];
});

hbs.registerHelper('or', function (a, b) {
    return a || b;
});

hbs.registerHelper('subtract', function(a, b) {
    return a - b;
});

hbs.registerHelper('toString', function(value) {
    return value.toString();
});

hbs.registerHelper('length', function(value) {
    return value.length;
});

hbs.registerHelper('multiply', function(a, b) {
    return a * b;
});

hbs.registerHelper('divide', function(a, b) {
    return a / b;
});

hbs.registerHelper('math', function(a, b, operator) {
    return math[operator](a, b);
});

// Add this if you haven't already
hbs.registerHelper('roundPrice', function(price) {
    return Math.round(Number(price));
});

hbs.registerHelper('ne', function (v1, v2) {
    return v1 !== v2;
});

hbs.registerHelper('multiply', function(a, b) {
    return a * b;
});

hbs.registerHelper('calculateDiscount', function(price, discountValue) {
    return price - (price * (discountValue / 100));
});

hbs.registerHelper('calculateOfferDiscount', (price, discountValue) => {
    return Math.round((price * discountValue) / 100);
});

hbs.registerHelper('hasOffer', function(products) {
    return products.offer || (products.category && products.category.offer);
});

hbs.registerHelper('limit', function(value, limit) {
    return value.slice(0, limit);
});

hbs.registerHelper('add', function(a, b) {
    return a + b;
});

hbs.registerHelper('lt', function(a, b) {
    return a < b;
}); 

hbs.registerHelper('capitalize', function(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
});

hbs.registerHelper('multiply', function(price, quantity) {
    return price * quantity;
});

hbs.registerHelper('calculateSubtotal', function(price, quantity) {
    return price * quantity;
});

hbs.registerHelper('not', function(value) {
    return !value;
});

hbs.registerHelper('sum', function(array, key) {
    return array.reduce((sum, item) => sum + item[key], 0);
});


hbs.registerHelper('eq', function (a, b) {
    return a.toString() === b.toString();
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

// Initialize passport after session middleware
app.use(passport.initialize());
app.use(passport.session());

//partials path
const partialsPath=path.join(__dirname,"./views/partials")

//hbs partials
hbs.registerPartials(partialsPath);




app.use('/user',userRoutes);
app.use('/admin',adminRoutes);



app.get('/',(req,res)=>{
    res.redirect('/user/home')
})




app.listen(port,()=>{
    console.log(`App is listening on port :${port}`);
})