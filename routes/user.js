const express=require("express")
const router=express.Router();
const userController=require("../controller/userController")
const userAuth=require('../middleware/userAuth')
const passport=require("passport")
const upload=require('../utils/cloudinary');
const addressController=require("../controller/addressController");
const productController = require("../controller/productController");
const shopController=require('../controller/shopController');

//user signup
router.get("/signup",userController.loadSignup)
router.post('/signup',userController.registerUser)

// otp verification page
router.get('/verify-otp',userController.loadOtp)
router.post('/verify-otp',userController.verifyOtp)

//resend otp
router.post('/resend-otp',userController.resendOtp)

//user login  
router.get('/login',userAuth.isLogin,userController.loadLogin)
router.post('/login',userController.loginUser)

//home page
router.get('/home',userAuth.checkSession, userController.loadHome)

//product view
router.get("/productView/:productId",userAuth.checkSession,userController.loadproductView)

//shop page
router.get("/shop",userAuth.checkSession,shopController.loadShopPage);

//cart
router.get("/cart",userAuth.checkSession,userController.loadCart);
router.post("/addToCart",userAuth.checkSession,userController.addToCart);
router.post("/updateCartQuantity",userAuth.checkSession,userController.updateCartQuantity);
router.post("/removeFromCart", userAuth.checkSession, userController.removeFromCart);

//load user profile
router.get('/profile',userAuth.checkSession,userController.loadProfile);
router.post('/updateProfile', userAuth.checkSession, upload.single('profileImage'), userController.updateProfile);

//load address
router.get("/addresses",userAuth.checkSession,userController.loadAddress);
router.post("/address",userAuth.checkSession,addressController.addAddress);
router.post("/address/:id",userAuth.checkSession,addressController.editAddress);
router.delete("/address/:id",userAuth.checkSession,addressController.deleteAddress);

//load checkout
router.get("/checkout",userAuth.checkSession,userController.loadCheckout);
router.post("/checkout",userAuth.checkSession,userController.placeOrder);

//load orders
router.get("/orders",userAuth.checkSession,userController.loadOrders);

//load order view
router.get('/orderView/:id',userController.loadOrderView);

//google authenctication
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/user/login'}),(req,res)=>{
    res.redirect('/user/home')
})

//logout
router.get('/logout',userAuth.checkSession,userController.loadLogout)




module.exports= router ;