const userSchema=require("../model/userModel");
const bcrypt=require("bcrypt");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = require("../routes/user");
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

            return res.status(200).json({status:true, isBlock:false,message:"Login Successfully"})
        } catch (error) {
             res.status(500).json({status:false,message:"Error Occured"})
        }
    }, 
    
    //loadotp page
    loadOtp:(req,res)=>{
        try {
            const {email} = req.query; //get email from query parameter
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
            if (timeElapsed < 1 * 60 * 1000) { // OTP valid for 1 minutes
                //create user in database
                const { name, password } = otpStore[email];
                const hashedPassword = await bcrypt.hash(password, saltrounds);
                const newUser = new userSchema({ name, email, password: hashedPassword, status: true });
                await newUser.save();

                // Clear OTP store for the user
                delete otpStore[email];

                // Redirect to  homepage
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
        const resendCooldown = 60 * 1000;  // 1 minute cooldown

        if (otpStore[email]) {
            const timeElapsed = currentTime - otpStore[email].time;
            if (timeElapsed < resendCooldown) {
                const remainingTime = Math.ceil((resendCooldown - timeElapsed) / 1000);
                res.status(400).json({ status: false, message: `Please wait ${remainingTime} seconds before resending OTP.` });  
            }
        }

        // Generate new OTP and send email
        const otp = crypto.randomInt(1000, 10000);
        otpStore[email] = { ...otpStore[email],otp: otp, time: currentTime };
        //send new OTP
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

    loadHome:(req,res)=>{
        try {
            res.render("user/home")
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },

    
};

// Function to send OTP email
function sendOtpEmail(email, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user:process.env.EMAIL, //  your email
            pass:process.env.PASS, //  your app password
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

