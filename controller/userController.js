const userSchema=require("../model/userModel");
const productSchema=require("../model/productSchema")
const bcrypt=require("bcrypt");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = require("../routes/user");
const product = require("../model/productSchema");
const category = require("../model/categorySchema");
const saltrounds=10;
require('dotenv').config();
let otpStore = {};  // To temporarily store OTPs 


module.exports={
    //register user
    registerUser:async (req,res)=>{
        try {
           const{name,email,password}=req.body
           console.log(`Name: ${name} , Email: ${email} , Password: ${password}`)

           // Check if user exists
           const existingUser = await userSchema.findOne({ email: email });
           if (existingUser) {
               return res.status(400).json({status:false,message:"User already exists"})
           }

           // Generate OTP and store it temporarily
           const otp = crypto.randomInt(1000, 10000); // 4-digit OTP
           otpStore[email] = { otp: otp, time: Date.now(), name, email, password };

           // Send OTP via email
           sendOtpEmail(email, otp);

           // Render OTP verification page
           return res.status(200).json({status:true,message:"OTP sent successfully",email:email})
           
       } catch (error) {
           console.error("Error during registration:", error);
           res.status(500).json({status:false ,message:"An error occurred during registration"});
       }
   },
    //load signup
    loadSignup:(req,res)=>{
        try {
          res.render("user/signup")  
        } catch (error) {
            res.status(500).send("page not found")
        }
    },
    //load login
    loadLogin:(req,res)=>{
        try {
            res.render("user/login")
        } catch (error) {
            res.status(500).send("error occured")
        }
    },
    // login user
    loginUser:async (req,res)=>{
        try {
            const { email, password } = req.body
            console.log(`Email: ${email}, Password: ${password}`);

            const user= await userSchema.findOne({email:email})
            
            if(!user){
                return res.status(400).json({status:false,message:"User doesn't exist"})
            }
            const match= await bcrypt.compare(password,user.password)
            if(!match){
                return res.status(400).json({status:false,message:"Password doesn't match"})
            }
            if(user.isBlock){
                return res.status(400).json({status:false,isBlock:true,messsage:"User is Blocked by admin"})
            }
            req.session.user=user.id;
            return res.status(200).json({status:true, isBlock:false,message:"Login Successfully"})
            
        } catch (error) {
             res.status(500).json({status:false,message:"Error Occured"})
        }
    }, 
    
    //loadotp page
    loadOtp:(req,res)=>{
        try {
            const {email} = req.query; 
            res.render('user/verifyOtp',{email}) //load otp page
            
        } catch (error) {
            console.log("otp page not found")
            res.status(500).json({status: false,message: "Error loading OTP verification page"});
            
        }
    },

    // Verify OTP
    verifyOtp: async (req, res) => {
      try{  
        const { email, otp } = req.body;

        console.log("verify otp :" +otp)
        if (!otpStore[email]) {
            return res.status(400).json({ status: false, message: "No OTP request found for this email" });
        }


        if (otpStore[email] && otpStore[email].otp == otp) {
            const timeElapsed = Date.now() - otpStore[email].time;
            if (timeElapsed < 1 * 60 * 1000) { // otp valid for 1 minutes
                //create user in database
                const { name, password } = otpStore[email];
                const hashedPassword = await bcrypt.hash(password, saltrounds);
                const newUser = new userSchema({ name, email, password: hashedPassword, status: true });
                await newUser.save();

                // clear otp store
                delete otpStore[email];
                // redirect to home
                return res.status(200).json({ status: true, message: "OTP verified successfully, user created!" });
            } else {
                return res.status(400).json({ status: false, message: "OTP expired. Please request a new one." });
            }
        } else {
            res.status(400).json({ status: false, message: "Invalid OTP" });
        }
     } catch(error){
            console.error("Error during OTP verification:", error);
            res.status(500).json({status:false,message: "An error occurred during OTP verification"});
     }
    },

    // Resend OTP
    resendOtp: (req, res) => {
      try{  
        const { email } = req.body;
        const currentTime = Date.now();
        const resendCooldown = 60 * 1000;  

        if (otpStore[email]) {
            const timeElapsed = currentTime - otpStore[email].time;
            if (timeElapsed < resendCooldown) {
                const remainingTime = Math.ceil((resendCooldown - timeElapsed) / 1000);
                res.status(400).json({ status: false, message: `Please wait ${remainingTime} seconds before resending OTP.` });  
            }
        }

        
        const otp = crypto.randomInt(1000, 10000);
        otpStore[email] = { ...otpStore[email],otp: otp, time: currentTime };
        
        sendOtpEmail(email, otp);

        res.status(200).json({ status: true, message: "OTP resent successfully." });
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({
            status: false,
            message: "Error resending OTP"
        });
     }
   },

    loadHome:async (req,res)=>{
        try {
            const products= await productSchema.find({isDeleted:false}).populate({path:'category',match: {isBlock:false}}).exec();

            const filterProduct= products.filter(product=> product.category !==null)

            const Obj=filterProduct.map((data)=>{
                return{
                    _id:data._id,
                    name:data.name,
                    description:data.description,
                    category:data.category,
                    brand:data.brand,
                    price:data.price,
                    images:data.images
                }
            })
            res.render("user/home",{data:Obj})
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },
    loadproductView:async(req,res)=>{
        try {
            const findProduct=await productSchema.findById(req.params.productId)

            const products=await productSchema.find({isDeleted:false}).populate({path:"category",match:{isBlock:false}}).exec()
            const filterProduct=products.filter(product=> product.category!==null)

            const Obj=filterProduct.map((find)=>{
                return{
                    _id:find._id,
                    name:find.name,
                    description:find.description,
                    category:find.category,
                    brand:find.brand,
                    price:find.price,
                    images:find.images
                }
            })
            
           res.render("user/productView",{data:findProduct,find:Obj}) 
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },
    //loadShopPage
    loadShopPage:async (req,res)=>{
        try {
            
            const products=await productSchema.find({isDeleted:false}).populate({path:"category", match:{isBlock:false}}).exec()

            const filterProduct=products.filter(product=> product.category!==null)

            const Obj=filterProduct.map((data)=>{
                return{
                    _id:data._id,
                    name:data.name,
                    description:data.description,
                    category:data.category,
                    brand:data.brand,
                    price:data.price,
                    images:data.images
                }
                
            })

            res.render("user/shop",{data:Obj})
        } catch (error) {
            console.log(error)
            res.status(500).send("Error occured")
        }
     },

    //load logout
    loadLogout:(req,res)=>{
        try {
            req.session.destroy();
            res.redirect('/user/login')
        } catch (error) {
            console.log(error)
            res.status(500).send("Error occured")
        }
    }
     
    
};

// function to send otp to email
function sendOtpEmail(email, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user:process.env.EMAIL, 
            pass:process.env.PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'OTP Verification',
        text: `Your OTP code is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("error sending email: ",error);
        } else {
            console.log('OTP sent: ', otp );
        }
    }); 

}

