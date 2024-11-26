const express=require("express")
const router=express.Router();
const userController=require("../controller/userController")
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
router.get('/login',userController.loadLogin)
router.post('/login',userController.loginUser)

//home page
router.get('/home',userController.loadHome)


// Google login route
// router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// // Google callback route
// router.get(
//   '/auth/google/callback',
//   passport.authenticate('google', { failureRedirect: '/user/login' }),
//   (req, res) => {
//     // Successful authentication
//     res.redirect('/user/home');
//   }
// );

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/user/login'}),(req,res)=>{
    res.redirect('/user/home')
})




module.exports= router ;