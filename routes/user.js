const express=require("express")
const router=express.Router();
const userController=require("../controller/userController")
const userAuth=require('../middleware/userAuth')
const passport=require("passport")
const upload=require('../utils/cloudinary');
const addressController=require("../controller/addressController");
const productController = require("../controller/productController");
const shopController=require('../controller/shopController');



router.use(userAuth.clearCheckoutCoupon);


//  checkBlockStatus 
router.use(userAuth.checkBlockStatus);

//search routes
router.get('/search-suggestions', userController.getSearchSuggestions);
router.get('/search', userController.searchProducts);

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
router.get('/home', userController.loadHome)

//product view
router.get("/productView/:productId",userController.loadproductView)

//shop page
router.get("/shop",shopController.loadShopPage);

//cart
router.get("/cart",userAuth.checkSession,userController.loadCart);
router.post("/addToCart",userController.addToCart);
router.post("/updateCartQuantity",userAuth.checkSession,userController.updateCartQuantity);
router.post("/removeFromCart", userAuth.checkSession, userController.removeFromCart);

//validate cart
router.post('/validateCart', userAuth.checkSession, userController.validateCart);

//load user profile
router.get('/profile',userAuth.checkSession,userController.loadProfile);
router.post('/updateProfile', userAuth.checkSession, upload.single('profileImage'), userController.updateProfile);

//load address
router.get("/addresses",userAuth.checkSession,userController.loadAddress);
router.post("/address", userAuth.checkSession, addressController.addAddress);
router.post("/address/:id", userAuth.checkSession, addressController.editAddress);
router.delete("/address/:id", userAuth.checkSession, addressController.deleteAddress);

//load checkout
router.get("/checkout",userAuth.checkSession,userController.loadCheckout);
router.post("/checkout",userAuth.checkSession,userController.placeOrder);
// Verify Razorpay payment
router.post('/verify-payment', userAuth.checkSession, userController.verifyPayment);


//load orders
router.get("/orders",userAuth.checkSession,userController.loadOrders);

//load order view
router.get('/orderView/:id',userAuth.checkSession,userController.loadOrderView);
router.get('/cancelOrder/:id',userAuth.checkSession,userController.cancelOrder);
router.post('/returnOrder/:id',userAuth.checkSession,userController.returnOrder);

//apply coupon
router.post('/apply-coupon',userAuth.checkSession,userController.applyCoupon);

//reset password
router.get('/forgetPasswordEmail',userController.loadForgetPasswordEmail);
router.post('/forgetPasswordEmail',userController.forgetPasswordEmail);
router.get('/forgetPassOtp', userController.loadForgetPassOtp);
router.post('/verifyForgetPassOtp', userController.verifyForgetPassOtp);
router.get('/forgetPassword',userController.loadForgetPassword);
router.post('/forgetPassword',userController.forgetPassword);

//load wishlist
router.get('/wishlist',userAuth.checkSession,userController.loadWishlist);
router.post('/toggle-wishlist/:productId', userController.toggleWishlist);

//load wallet
router.get('/wallet',userAuth.checkSession,userController.loadWallet);

//google authenctication
router.get('/auth/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'consent',
    access_type: 'offline'
  })
);

router.get('/auth/google/callback', 
  passport.authenticate('google', {
    failureRedirect: '/user/login',
    failureFlash: true
  }),
  (req, res) => {
    // Successful authentication
    req.session.user = req.user._id;
    res.redirect('/user/home');
  }
);

//wallet routes
router.post('/addWalletMoney', userAuth.checkSession, userController.addWalletMoney);
router.post('/verifyWalletPayment', userAuth.checkSession, userController.verifyWalletPayment);

//reset password
router.post('/resetPassword', userAuth.checkSession, userController.resetPassword);

//repay order
router.post('/repay-order/:orderId', userAuth.checkSession, userController.repayOrder);

// Add this route with the proper controller reference
router.post('/payment-failed', userAuth.checkSession, userController.handlePaymentFailure);

//load Marval Category
router.get('/marvalCategory',userController.loadMarvalCategory);

//load Dc Comics Category
router.get('/dcComicsCategory',userController.loadDcComicsCategory);

//load Transformers Category
router.get('/transformersCategory',userController.loadTransformersCategory);

//logout
router.get('/logout',userAuth.checkSession,userController.loadLogout)


module.exports= router ;