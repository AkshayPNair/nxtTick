const express=require("express")
const router=express.Router();
const userController=require("../controller/userController")
const userAuth=require('../middleware/userAuth')
const passport=require("passport")

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
router.get("/shop",userController.loadShopPage);



router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/user/login'}),(req,res)=>{
    res.redirect('/user/home')
})

//logout
router.get('/logout',userAuth.checkSession,userController.loadLogout)




module.exports= router ;